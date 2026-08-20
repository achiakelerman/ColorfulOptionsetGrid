import * as React from "react";
import MultiSelect from "./Controls/MultiSelect";

export interface DashboardConfig {
    mode: "THERAPIST" | "PROVIDER";
    therapistQueueName: string;
    providerQueueName: string;
    waitingQueueItemStateCode: string;
    waitingQueueItemStatusCode: string;
    genderAttribute: string;
    languageAttribute: string;
    dayAttribute: string;
    timeAttribute: string;
    queueTypeAttribute: string;
    cityEntityName: string;
    cityIdAttribute: string;
    cityNameAttribute: string;
    incidentCityLinkEntity: string;
    incidentCityAttribute: string;
    cityLinkLookupAttribute: string;
}

type ChoiceOption = { label: string; value: number | string };
type DashboardRecord = {
    id: string;
    ticketNumber: string;
    title: string;
    priority: string;
    gender: string;
    language: string;
    day: string;
    time: string;
    queueType: string;
    createdOn: string;
};

type FilterState = {
    gender: ChoiceOption[];
    language: ChoiceOption[];
    day: ChoiceOption[];
    time: ChoiceOption[];
    queueType: ChoiceOption[];
    city: ChoiceOption[];
    search: string;
};

export interface TreatmentRequestsDashboardProps {
    context: ComponentFramework.Context<any>;
    config: DashboardConfig;
}

const emptyFilters = (): FilterState => ({
    gender: [],
    language: [],
    day: [],
    time: [],
    queueType: [],
    city: [],
    search: ""
});

const escapeXml = (value: string): string => value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const formatDate = (value: string | undefined): string => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString("he-IL");
};

export const TreatmentRequestsDashboard = React.memo(function TreatmentRequestsDashboard({
    context,
    config
}: TreatmentRequestsDashboardProps): JSX.Element {
    const [filters, setFilters] = React.useState<FilterState>(emptyFilters);
    const [records, setRecords] = React.useState<DashboardRecord[]>([]);
    const [cities, setCities] = React.useState<ChoiceOption[]>([]);
    const [choiceOptions, setChoiceOptions] = React.useState<Record<string, ChoiceOption[]>>({});
    const [multiSelectAttributes, setMultiSelectAttributes] = React.useState<Set<string>>(new Set());
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string>("");
    const [hasSearched, setHasSearched] = React.useState(false);

    const queueName = config.mode === "THERAPIST" ? config.therapistQueueName : config.providerQueueName;

    const loadChoiceOptions = React.useCallback(async () => {
        const attributes = [
            config.genderAttribute,
            config.languageAttribute,
            config.dayAttribute,
            config.timeAttribute,
            config.queueTypeAttribute
        ];

        const metadata = await context.utils.getEntityMetadata("incident", attributes);
        const next: Record<string, ChoiceOption[]> = {};
        const nextMultiSelectAttributes = new Set<string>();

        metadata.Attributes.forEach((attribute: any) => {
            if (attribute.AttributeType === "MultiSelectPicklist") {
                nextMultiSelectAttributes.add(attribute.LogicalName);
            }

            const options = attribute.OptionSet?.Options ?? attribute.GlobalOptionSet?.Options ?? [];
            next[attribute.LogicalName] = options
                .filter((option: any) => option.Value !== undefined && option.Label?.UserLocalizedLabel?.Label)
                .map((option: any) => ({
                    value: option.Value,
                    label: option.Label.UserLocalizedLabel.Label
                }))
                .sort((a: ChoiceOption, b: ChoiceOption) => a.label.localeCompare(b.label));
        });

        setChoiceOptions(next);
    setMultiSelectAttributes(nextMultiSelectAttributes);
    }, [context.utils, config]);

    const loadCities = React.useCallback(async () => {
        const response = await context.webAPI.retrieveMultipleRecords(
            config.cityEntityName,
            `?$select=${config.cityIdAttribute},${config.cityNameAttribute}&$orderby=${config.cityNameAttribute}`
        );

        setCities(response.entities
            .map((city: any) => ({
                value: city[config.cityIdAttribute],
                label: city[config.cityNameAttribute]
            }))
            .filter((city: ChoiceOption) => !!city.value && !!city.label));
    }, [context.webAPI, config]);

    const buildChoiceCondition = (attribute: string, values: ChoiceOption[], multiSelect = false): string => {
        if (values.length === 0) return "";
        const operator = multiSelect ? "contain-values" : "in";
        const valueXml = values.map((option) => `<value>${escapeXml(String(option.value))}</value>`).join("");
        return `<condition attribute='${attribute}' operator='${operator}'>${valueXml}</condition>`;
    };

    const resolveIncidentIdsForCities = React.useCallback(async (selectedCities: ChoiceOption[]): Promise<string[]> => {
        if (selectedCities.length === 0) return [];

        const valueXml = selectedCities.map((city) => `<value>${escapeXml(String(city.value))}</value>`).join("");
        const fetchXml = [
            "<fetch distinct='true'>",
            `<entity name='${config.incidentCityLinkEntity}'>`,
            `<attribute name='${config.incidentCityAttribute}'/>`,
            "<filter>",
            `<condition attribute='${config.cityLinkLookupAttribute}' operator='in'>${valueXml}</condition>`,
            "</filter>",
            "</entity>",
            "</fetch>"
        ].join("");

        const response = await context.webAPI.retrieveMultipleRecords(
            config.incidentCityLinkEntity,
            `?fetchXml=${encodeURIComponent(fetchXml)}`
        );

        return response.entities
            .map((row: any) => row[config.incidentCityAttribute])
            .filter((id: string | undefined): id is string => !!id);
    }, [context.webAPI, config]);

    const loadRecords = React.useCallback(async (activeFilters: FilterState) => {
        setLoading(true);
        setError("");

        try {
            const cityIncidentIds = await resolveIncidentIdsForCities(activeFilters.city);
            if (activeFilters.city.length > 0 && cityIncidentIds.length === 0) {
                setRecords([]);
                return;
            }

            const cityCondition = cityIncidentIds.length > 0
                ? `<condition attribute='incidentid' operator='in'>${cityIncidentIds.map((id) => `<value>${escapeXml(id)}</value>`).join("")}</condition>`
                : "";
            const searchCondition = activeFilters.search.trim()
                ? `<filter type='or'><condition attribute='ticketnumber' operator='like' value='%${escapeXml(activeFilters.search.trim())}%'/><condition attribute='title' operator='like' value='%${escapeXml(activeFilters.search.trim())}%'/></filter>`
                : "";

            const fetchXml = [
                "<fetch distinct='true'>",
                "<entity name='incident'>",
                "<attribute name='incidentid'/><attribute name='ticketnumber'/><attribute name='title'/>",
                "<attribute name='prioritycode'/><attribute name='createdon'/>",
                `<attribute name='${config.genderAttribute}'/><attribute name='${config.languageAttribute}'/>`,
                `<attribute name='${config.dayAttribute}'/><attribute name='${config.timeAttribute}'/><attribute name='${config.queueTypeAttribute}'/>`,
                "<order attribute='prioritycode' descending='false'/><order attribute='createdon' descending='false'/>",
                "<filter type='and'>",
                "<condition attribute='statecode' operator='eq' value='0'/>",
                buildChoiceCondition(config.genderAttribute, activeFilters.gender, multiSelectAttributes.has(config.genderAttribute)),
                buildChoiceCondition(config.languageAttribute, activeFilters.language, multiSelectAttributes.has(config.languageAttribute)),
                buildChoiceCondition(config.dayAttribute, activeFilters.day, multiSelectAttributes.has(config.dayAttribute)),
                buildChoiceCondition(config.timeAttribute, activeFilters.time, multiSelectAttributes.has(config.timeAttribute)),
                buildChoiceCondition(config.queueTypeAttribute, activeFilters.queueType, multiSelectAttributes.has(config.queueTypeAttribute)),
                cityCondition,
                searchCondition,
                "</filter>",
                "<link-entity name='queueitem' from='objectid' to='incidentid' link-type='inner' alias='queueitem'>",
                `<filter type='and'><condition attribute='statecode' operator='eq' value='${escapeXml(config.waitingQueueItemStateCode)}'/><condition attribute='statuscode' operator='eq' value='${escapeXml(config.waitingQueueItemStatusCode)}'/></filter>`,
                "<link-entity name='queue' from='queueid' to='queueid' link-type='inner' alias='queue'>",
                `<filter><condition attribute='name' operator='eq' value='${escapeXml(queueName)}'/></filter>`,
                "</link-entity>",
                "</link-entity>",
                "</entity>",
                "</fetch>"
            ].join("");

            const response = await context.webAPI.retrieveMultipleRecords("incident", `?fetchXml=${encodeURIComponent(fetchXml)}`);
            setRecords(response.entities.map((row: any) => ({
                id: row.incidentid,
                ticketNumber: row.ticketnumber ?? "",
                title: row.title ?? "",
                priority: row["prioritycode@OData.Community.Display.V1.FormattedValue"] ?? "",
                gender: row[`${config.genderAttribute}@OData.Community.Display.V1.FormattedValue`] ?? "",
                language: row[`${config.languageAttribute}@OData.Community.Display.V1.FormattedValue`] ?? "",
                day: row[`${config.dayAttribute}@OData.Community.Display.V1.FormattedValue`] ?? "",
                time: row[`${config.timeAttribute}@OData.Community.Display.V1.FormattedValue`] ?? "",
                queueType: row[`${config.queueTypeAttribute}@OData.Community.Display.V1.FormattedValue`] ?? "",
                createdOn: formatDate(row.createdon)
            })));
        } catch (loadError: any) {
            setError(loadError?.message ?? "טעינת בקשות הטיפול נכשלה.");
            setRecords([]);
        } finally {
            setLoading(false);
        }
    }, [config, context.webAPI, multiSelectAttributes, queueName, resolveIncidentIdsForCities]);

    React.useEffect(() => {
        Promise.all([loadChoiceOptions(), loadCities()])
            .then(() => loadRecords(emptyFilters()))
            .catch((loadError: any) => {
                setError(loadError?.message ?? "טעינת הגדרות הדשבורד נכשלה.");
                setLoading(false);
            });
    }, [loadChoiceOptions, loadCities, loadRecords]);

    const updateFilter = (key: keyof Omit<FilterState, "search">, value: ChoiceOption[]) => {
        setFilters((current) => ({ ...current, [key]: value }));
    };

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        setHasSearched(true);
        loadRecords(filters);
    };

    const clear = () => {
        const cleared = emptyFilters();
        setFilters(cleared);
        setHasSearched(false);
        loadRecords(cleared);
    };

    const field = (label: string, key: keyof Omit<FilterState, "search">, options: ChoiceOption[]) => (
        <div className="treatment-dashboard__field">
            <label>{label}</label>
            <MultiSelect
                options={options}
                value={filters[key]}
                onChange={(values: ChoiceOption[]) => updateFilter(key, values ?? [])}
                isSelectAll={true}
                menuPlacement="bottom"
            />
        </div>
    );

    return <main className="treatment-dashboard" dir="rtl">
        <header className="treatment-dashboard__header">
            <h1>בקשות לטיפול</h1>
            <span>{config.mode === "THERAPIST" ? "מטפלים" : "ספקים"}</span>
        </header>

        <form className="treatment-dashboard__filters" onSubmit={submit}>
            <label className="treatment-dashboard__search">
                <span>חיפוש</span>
                <input value={filters.search} onChange={(event) => setFilters((current) => ({ ...current, search: event.target.value }))} placeholder="מספר בקשה או נושא" />
            </label>
            {field("מגדר", "gender", choiceOptions[config.genderAttribute] ?? [])}
            {field("שפה", "language", choiceOptions[config.languageAttribute] ?? [])}
            {field("יום", "day", choiceOptions[config.dayAttribute] ?? [])}
            {field("שעה", "time", choiceOptions[config.timeAttribute] ?? [])}
            {field("סוג תור", "queueType", choiceOptions[config.queueTypeAttribute] ?? [])}
            {field("עיר", "city", cities)}
            <button type="submit" className="treatment-dashboard__primary">חיפוש</button>
            <button type="button" className="treatment-dashboard__secondary" onClick={clear}>ניקוי</button>
        </form>

        {error && <div className="treatment-dashboard__error" role="alert">{error}</div>}
        {loading ? <div className="treatment-dashboard__state">טוען בקשות טיפול...</div> : records.length === 0 ? <div className="treatment-dashboard__state">לא נמצאו בקשות טיפול.</div> : <div className="treatment-dashboard__table-wrap">
            <table className="treatment-dashboard__table">
                <thead><tr><th>מספר בקשה</th><th>נושא</th><th>דחיפות</th><th>מגדר</th><th>שפה</th><th>יום</th><th>שעה</th><th>סוג תור</th><th>נוצר בתאריך</th></tr></thead>
                <tbody>{records.map((record) => <tr key={record.id}><td>{record.ticketNumber}</td><td>{record.title}</td><td>{record.priority}</td><td>{record.gender}</td><td>{record.language}</td><td>{record.day}</td><td>{record.time}</td><td>{record.queueType}</td><td>{record.createdOn}</td></tr>)}</tbody>
            </table>
        </div>}
        {hasSearched && !loading && records.length === 0 && <span className="treatment-dashboard__sr-only">החיפוש לא החזיר תוצאות.</span>}
    </main>;
});
