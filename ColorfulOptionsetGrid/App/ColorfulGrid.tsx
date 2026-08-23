// @ts-nocheck
/* eslint-disable no-unused-vars */
import * as React from 'react';
import { useEffect } from 'react';

import { DetailsList, IColumn, DetailsListLayoutMode, SelectionMode, ConstrainMode } from '@fluentui/react/lib/DetailsList';
import { initializeIcons } from '@fluentui/react/lib/Icons';

import { ColumnWidthCallback, getDefaultColumnSetup, IGridColumn, useColumns } from './Generic/Hooks/useColumns';
import { useSelection } from './Generic/Hooks/useSelection';

import { ColorfulCell } from './Controls/ColorfulCell';
import { useConfig } from './Hooks/useConfig';
import { GridOverlay } from './Generic/Components/GridOverlay';
import { useItems } from './Generic/Hooks/useItems';
import { gridHeader } from './Generic/Components/GridHeader';
import { IInputs } from '../generated/ManifestTypes';
import { ActionMeta, MultiValue } from 'react-select';
import MultiSelect from './Controls/MultiSelect';
import LoadingGIF from './Controls/LoadingGIF';

type DataSet = ComponentFramework.PropertyTypes.DataSet;

initializeIcons();
export interface IsukGroup {
    region: string;
    district: string;
    approvalLevel: number,
    isukGroups: any[]
}

export class CacheHelper {
    public static saveJson<T>(key: string, value: T) {
        try {
            sessionStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            if (e instanceof DOMException && e.name === "QuotaExceededError") { // TODO
                console.warn("Storage quota exceeded — consider trimming data or using indexedDB");
            }
        }
    }

    public static tryLoadJson<T>(key: string): T | null {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        try { return JSON.parse(raw) as T; } catch { return null; }

    }

    public static buildCacheKey(context: ComponentFramework.Context<IInputs>, keyName: string) {
        return `ColorfulGrid_${keyName}:${context.userSettings.userId}${context.parameters.filterByIsuk.raw || ""}`;
    }
}

type UIState = {
    searchWord?: string;
    fromDate?: string;    // yyyy-MM-dd
    toDate?: string;      // yyyy-MM-dd
    statusValues?: (string | number)[];
    regionValues?: string[];
    visitUnitStatusValues?: (string | number)[];
    //caregiverValues?: string[];
    isukValues?: string[];
};

enum VisitUnitStatus {
    Empty = 1,
    InUnit = 2,
    NotInUnit = 3
}

export interface IColorfulGridProps {
    context: ComponentFramework.Context<IInputs>;
    dataset: DataSet;
    utils: ComponentFramework.Utility;
    displayTextType: "SIMPLE" | "BOX" | "BORDER" | "NOTEXT";
    displayIconType: "NONE" | "NAME";// | "ENVIRONMENT";
    defaultIcon: string;
    iconConfig1?: string;
    iconConfig2?: string;
    iconConfig3?: string;
    containerWidth?: number;
    containerHeight?: number;
    isSubgrid: boolean;
    setFullScreen: (value: boolean) => void;
    isEditable: boolean;
    employeeJobs: ComponentFramework.WebApi.Entity[],
    userIsukGroups: IsukGroup[] | undefined;
    subFilters: ComponentFramework.PropertyHelper.DataSetApi.FilterExpression;
    cacheFilterKey: string;
    updatedProperties: string[];
    dashboardConfigurationError?: string;
}

export const ColorfulGrid = function ColorfulGridApp({
    context,
    dataset,
    utils,
    displayTextType,
    displayIconType,
    defaultIcon,
    iconConfig1,
    iconConfig2,
    iconConfig3,
    containerWidth,
    containerHeight,
    isSubgrid,
    setFullScreen,
    isEditable,
    employeeJobs,
    userIsukGroups,
    subFilters,
    cacheFilterKey,
    updatedProperties,
    dashboardConfigurationError
}: IColorfulGridProps): JSX.Element {
    const entityName = "el_homevisit_task";
    const isDashboardMode = context.parameters.dashboardMode?.raw === "THERAPIST" || context.parameters.dashboardMode?.raw === "PROVIDER";
    const queueItemAlias = (context.parameters.queueItemAlias?.raw ?? "queueitem").trim();
    const queueAlias = (context.parameters.queueAlias?.raw ?? "queue").trim();
    const dashboardQueueName = isDashboardMode
        ? (context.parameters.dashboardMode?.raw === "THERAPIST"
            ? (context.parameters.therapistQueueName?.raw ?? "בקשות לטיפול מטפלים")
            : (context.parameters.providerQueueName?.raw ?? "בקשות לטיפול ספקים"))
        : "";
    const cityLinkAlias = (context.parameters.cityLinkAlias?.raw ?? "citylink").trim();
    const cityLookupAttribute = (context.parameters.cityLookupAttribute?.raw ?? "mac_cityid").trim();
    const cityEntityName = (context.parameters.cityEntityName?.raw ?? "ey_city").trim();
    const cityIdAttribute = (context.parameters.cityIdAttribute?.raw ?? "ey_cityid").trim();
    const cityNameAttribute = (context.parameters.cityNameAttribute?.raw ?? "ey_s_name").trim();
    const requireActiveOnly = (context.parameters.requireActiveOnly?.raw ?? "true") === "true";
    const showDashboardFilters = (context.parameters.showDashboardFilters?.raw ?? "true") === "true";

    const genderAttribute = (context.parameters.genderAttribute?.raw ?? "mac_p_member_gender").trim();
    const languageAttribute = (context.parameters.languageAttribute?.raw ?? "mac_p_preferred_language").trim();
    const timeAttribute = (context.parameters.timeAttribute?.raw ?? "mac_p_preferred_time").trim();
    const queueTypeAttribute = (context.parameters.queueTypeAttribute?.raw ?? "mac_p_preferred_queue_type").trim();

    const parseIntOrDefault = (value: string | null | undefined, fallback: number): number => {
        const parsed = Number.parseInt(value ?? "", 10);
        return Number.isFinite(parsed) ? parsed : fallback;
    };

    const datasetHasAlias = (alias: string): boolean => {
        if (!alias) return false;
        return context.parameters.dataset.columns.some(c => c.name === alias || c.name.startsWith(`${alias}.`));
    };

    const incidentActiveStateCode = parseIntOrDefault(context.parameters.incidentActiveStateCode?.raw, 0);
    const waitingQueueItemStateCode = parseIntOrDefault(context.parameters.waitingQueueItemStateCode?.raw, 1);
    const waitingQueueItemStatusCode = parseIntOrDefault(context.parameters.waitingQueueItemStatusCode?.raw, 2);
    const hasQueueItemAlias = datasetHasAlias(queueItemAlias);
    const hasQueueAlias = datasetHasAlias(queueAlias);
    const hasCityLinkAlias = datasetHasAlias(cityLinkAlias);

    const requiredMetadataAttributes = React.useMemo(() => {
        if (!isDashboardMode) return [];
        return [genderAttribute, languageAttribute, timeAttribute, queueTypeAttribute];
    }, [isDashboardMode, genderAttribute, languageAttribute, timeAttribute, queueTypeAttribute]);

    const { defaultIconNames, metadataAttributes } = useConfig(
        dataset,
        defaultIcon,
        utils,
        iconConfig1,
        iconConfig2,
        iconConfig3,
        requiredMetadataAttributes
    );
    const columnWidthCalculator: ColumnWidthCallback = (column: ComponentFramework.PropertyHelper.DataSetApi.Column, preCalculatedWidth: number) => {
        const isOptionSetRenderer: boolean = metadataAttributes?.has(column.name)
        if (isOptionSetRenderer === false) {
            return preCalculatedWidth;
        }
        return (displayTextType === "NOTEXT")
            ? 30
            : preCalculatedWidth + 30
    }
    const { columns: gridColumns, onColumnClick } = useColumns(dataset, containerWidth, columnWidthCalculator);
    const { items } = useItems(context.parameters.dataset);
    const { selection, selectedCount, onItemInvoked } = useSelection(dataset);
    const [selectedPlaces, setSelectedPlaces] = React.useState([]);
    const [selectedVisitUnitStatuses, setSelectedVisitUnitStatuses] = React.useState<any[]>([]);
    //const [selectedCaregivers, setSelectedCaregivers] = React.useState([]);
    const [selectedIsuks, setSelectedIsuks] = React.useState([]);
    const [selectedStatuses, setSelectedStatuses] = React.useState([]);
    const [fromDate, setFromDate] = React.useState("");
    const [toDate, setToDate] = React.useState("");
    const [searchWordInput, setSearchWordInput] = React.useState("");
    const [error, setError] = React.useState(dashboardConfigurationError ?? "");

    const [selectedGenders, setSelectedGenders] = React.useState<any[]>([]);
    const [selectedLanguages, setSelectedLanguages] = React.useState<any[]>([]);
    const [selectedTimes, setSelectedTimes] = React.useState<any[]>([]);
    const [selectedQueueTypes, setSelectedQueueTypes] = React.useState<any[]>([]);
    const [selectedCities, setSelectedCities] = React.useState<any[]>([]);
    const [applyClientCityFilter, setApplyClientCityFilter] = React.useState<boolean>(false);
    const [allCityOptions, setAllCityOptions] = React.useState<Array<{ label: string; value: string }> | null>(null);

    const [builtInFilterOptions, setBuiltInFilterOptions] = React.useState<any[]>([]);

    const builtInFilterCount1 = useBuiltInFilterCount(context.parameters.builtInFilterText1?.raw ?? "");
    const builtInFilterCount2 = useBuiltInFilterCount(context.parameters.builtInFilterText2?.raw ?? "");
    const builtInFilterCount4 = useBuiltInFilterCount(context.parameters.builtInFilterText4?.raw ?? "");

    const [currentBuiltInFilter, setCurrentBuiltInFilter] = React.useState<string>("");

    const getChoiceOptions = (attributeName: string): any[] => {
        const metadata = metadataAttributes.get(attributeName);
        if (!metadata) return [];

        const options: any[] = [];
        metadata.forEach((valueInfo, key) => {
            options.push({ label: valueInfo.label, value: Number.parseInt(key, 10) });
        });

        return options
            .filter(o => Number.isFinite(o.value))
            .sort((a, b) => a.label.localeCompare(b.label));
    };

    const genderOptions = React.useMemo(() => getChoiceOptions(genderAttribute), [metadataAttributes, genderAttribute]);
    const languageOptions = React.useMemo(() => getChoiceOptions(languageAttribute), [metadataAttributes, languageAttribute]);
    const timeOptions = React.useMemo(() => getChoiceOptions(timeAttribute), [metadataAttributes, timeAttribute]);
    const queueTypeOptions = React.useMemo(() => getChoiceOptions(queueTypeAttribute), [metadataAttributes, queueTypeAttribute]);

    const cityOptions = React.useMemo(() => {
        const result = new Map<string, { label: string; value: string }>();
        items.forEach(item => {
            const cityId = item[`${cityLinkAlias}.${cityLookupAttribute}`] as string | undefined;
            const cityName = item[`${cityLinkAlias}.${cityLookupAttribute}name`] as string | undefined;
            if (cityId) {
                result.set(cityId, { label: cityName ?? cityId, value: cityId });
            }
        });
        const values: Array<{ label: string; value: string }> = [];
        result.forEach(v => values.push(v));
        return values.sort((a, b) => a.label.localeCompare(b.label));
    }, [items, cityLinkAlias, cityLookupAttribute]);

    const cityOptionsFromColumns = React.useMemo(() => {
        const cityColumn = context.parameters.dataset.columns.find(c => c.name.endsWith(`${cityLookupAttribute}name`))
            ?? context.parameters.dataset.columns.find(c => c.name.toLowerCase().includes("city") && c.name.endsWith("name"));
        if (!cityColumn) return [] as Array<{ label: string; value: string }>;

        const result = new Map<string, { label: string; value: string }>();
        items.forEach(item => {
            const name = item[cityColumn.name] as string | undefined;
            if (name && name.trim() !== "") {
                result.set(name, { label: name, value: name });
            }
        });

        const values: Array<{ label: string; value: string }> = [];
        result.forEach(v => values.push(v));
        return values.sort((a, b) => a.label.localeCompare(b.label));
    }, [items, context.parameters.dataset.columns, cityLookupAttribute]);

    React.useEffect(() => {
        if (!isDashboardMode) {
            setAllCityOptions(null);
            return;
        }

        const toSortedOptions = (map: Map<string, { label: string; value: string }>) => {
            const values: Array<{ label: string; value: string }> = [];
            map.forEach(v => values.push(v));
            return values.sort((a, b) => a.label.localeCompare(b.label));
        };

        let isCancelled = false;
        const result = new Map<string, { label: string; value: string }>();

        const loadCities = async (query: string): Promise<void> => {
            const response = await context.webAPI.retrieveMultipleRecords(cityEntityName, query, 5000);
            response.entities.forEach((entity) => {
                const id = entity[cityIdAttribute] as string | undefined;
                const name = entity[cityNameAttribute] as string | undefined;
                if (id) {
                    result.set(id, { label: name ?? id, value: id });
                }
            });

            if (response.nextLink) {
                const queryStart = response.nextLink.indexOf("?");
                await loadCities(queryStart >= 0 ? response.nextLink.substring(queryStart) : response.nextLink);
            }
        };

        const query = `?$select=${cityIdAttribute},${cityNameAttribute}&$orderby=${cityNameAttribute} asc`;
        loadCities(query)
            .then(() => {
                if (!isCancelled) {
                    setAllCityOptions(toSortedOptions(result));
                }
            })
            .catch(() => {
                if (!isCancelled) {
                    setAllCityOptions(null);
                }
            });

        return () => {
            isCancelled = true;
        };
    }, [isDashboardMode, cityEntityName, cityIdAttribute, cityNameAttribute]);

    React.useEffect(() => {
        setError(dashboardConfigurationError ?? "");
    }, [dashboardConfigurationError]);

    const effectiveCityOptions = React.useMemo(() => {
        const merged = new Map<string, { label: string; value: string }>();

        const add = (list: Array<{ label: string; value: string }> | null | undefined) => {
            if (!list) return;
            list.forEach((item) => {
                const key = `${item.value}`.trim();
                const label = `${item.label}`.trim();
                if (!key || !label) return;
                if (!merged.has(key)) {
                    merged.set(key, { label, value: key });
                }
            });
        };

        add(allCityOptions);
        add(cityOptions);
        add(cityOptionsFromColumns);

        const values: Array<{ label: string; value: string }> = [];
        merged.forEach(v => values.push(v));
        return values.sort((a, b) => a.label.localeCompare(b.label));
    }, [allCityOptions, cityOptions, cityOptionsFromColumns]);

    const guidPattern = /^[0-9a-f]{8}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{4}-?[0-9a-f]{12}$/i;

    const resolveIncidentIdsByCityGuids = async (cityGuids: string[]): Promise<string[] | null> => {
        if (!cityGuids || cityGuids.length === 0) return null;

        const linkEntityCandidates: Array<{ entity: string; incidentAttr: string; cityAttr: string }> = [
            { entity: "mac_incident_ey_city", incidentAttr: "mac_incidentid", cityAttr: "mac_cityid" },
            { entity: "ey_incident_city", incidentAttr: "ey_incidentid", cityAttr: "ey_cityid" },
            { entity: "new_incident_city", incidentAttr: "new_incidentid", cityAttr: "new_cityid" }
        ];

        for (const candidate of linkEntityCandidates) {
            try {
                const valuesXml = cityGuids.map((id) => `<value>${id}</value>`).join("");
                const fetchXml =
                    `<fetch distinct='true'>` +
                    `<entity name='${candidate.entity}'>` +
                    `<attribute name='${candidate.incidentAttr}'/>` +
                    `<filter>` +
                    `<condition attribute='${candidate.cityAttr}' operator='in'>${valuesXml}</condition>` +
                    `</filter>` +
                    `</entity>` +
                    `</fetch>`;

                const response = await context.webAPI.retrieveMultipleRecords(
                    candidate.entity,
                    `?fetchXml=${encodeURIComponent(fetchXml)}`
                );

                const ids = new Set<string>();
                response.entities.forEach((e: any) => {
                    const incidentId = e[candidate.incidentAttr];
                    if (incidentId && guidPattern.test(String(incidentId))) {
                        ids.add(String(incidentId));
                    }
                });

                if (ids.size > 0) {
                    return Array.from(ids);
                }
            } catch {
                // Try next candidate entity/field mapping.
            }
        }

        return [];
    };

    const filteredItems = React.useMemo(() => {
        if (!isDashboardMode || !applyClientCityFilter || selectedCities.length === 0) {
            return items;
        }

        const normalize = (v: any) => String(v ?? "").trim().toLowerCase();

        const selectedLabels = new Set<string>();
        const selectedValues = new Set<string>();

        selectedCities.forEach((c: any) => {
            if (c?.label) selectedLabels.add(normalize(c.label));
            if (c?.value) selectedValues.add(normalize(c.value));
        });

        if (selectedLabels.size === 0 && selectedValues.size === 0) {
            return items;
        }

        return items.filter((item) => {
            const rowValues: string[] = [];
            Object.keys(item).forEach((key) => {
                if (key === "raw" || key === "key") return;
                const value = item[key];
                if (value == null) return;
                rowValues.push(normalize(value));
            });

            if (rowValues.length === 0) {
                return false;
            }

            for (const rowValue of rowValues) {
                if (!rowValue) continue;

                if (selectedLabels.has(rowValue)) {
                    return true;
                }

                if (selectedValues.has(rowValue)) {
                    return true;
                }

                if (!guidPattern.test(rowValue)) {
                    for (const selectedLabel of selectedLabels) {
                        if (selectedLabel && rowValue.includes(selectedLabel)) {
                            return true;
                        }
                    }
                }
            }

            return false;
        });
    }, [isDashboardMode, applyClientCityFilter, items, selectedCities]);

    // When builtInFilterOptions or dataset filter changes, recompute current selection
    useEffect(() => {
        if (builtInFilterOptions && builtInFilterOptions.length == 3) { // TODO genreic
            const label = getCurrentBuiltInFilter();
            setCurrentBuiltInFilter(label);
        }
    }, [builtInFilterOptions]);

    function arraysEqualIgnoreOrder(a?: any[], b?: any[]) {
        if (!Array.isArray(a) || !Array.isArray(b)) return false;
        if (a.length !== b.length) return false;
        const sa = [...a].map(String).sort();
        const sb = [...b].map(String).sort();
        for (let i = 0; i < sa.length; i++) if (sa[i] !== sb[i]) return false;
        return true;
    }

    function getCurrentBuiltInFilter(): string {
        const filter = context.parameters.dataset.filtering.getFilter();
        if (!filter) return "";

        // Find the statuscode IN(...) at the top level OR inside any nested filter
        const statusValues: any[] | undefined = (() => {
            // 1) check top-level conditions
            const top = filter.conditions?.find(c => c.attributeName === "statuscode" && (c.conditionOperator === 8 /* in */));
            if (top && Array.isArray(top.value)) return top.value;

            // 2) search nested filters for a statuscode condition
            const stack: ComponentFramework.PropertyHelper.DataSetApi.FilterExpression[] = [...(filter.filters ?? [])];
            while (stack.length) {
                const f = stack.pop()!;
                const hit = f.conditions?.find(c => c.attributeName === "statuscode" && (c.conditionOperator === 8));
                if (hit && Array.isArray(hit.value)) return hit.value;
                if (f.filters?.length) stack.push(...f.filters);
            }
            return undefined;
        })();

        if (!statusValues || statusValues.length === 0) return "";

        // Match against builtInFilterOptions (label -> value[])
        const match = builtInFilterOptions.find(
            o => Array.isArray(o.value) && arraysEqualIgnoreOrder(o.value, statusValues)
        );

        return match?.label ?? "";
    }

    const smallScreen = useSmallScreen();
    function useSmallScreen(): boolean {
        const [smallScreen, setSmallScreen] = React.useState<boolean>(window.innerWidth <= 1366);

        useEffect(() => {
            const handleResize = () => {
                context.parameters.dataset.paging.setPageSize((window.innerWidth <= 1366) ? 6 : 11);
                context.parameters.dataset.refresh();
                setSmallScreen(window.innerWidth <= 1366);
            };

            window.addEventListener('resize', handleResize);
        }, []);

        return smallScreen;
    }

    const statusOptions = useStatuses();
    function useStatuses(): any[] | undefined {
        const [statusOptions, setStatusOptions] = React.useState<any[] | undefined>(undefined);
        useEffect(() => {
            const options = builtInFilterOptions.filter(o => o.label == currentBuiltInFilter);
            if (options && options[0] && options[0].value) {
                const statusMetadata = metadataAttributes.get("statuscode");
                setStatusOptions((options[0].value).map((option: any) => {
                    const label = statusMetadata?.get(option.toString())?.label ?? "";
                    if (label) {
                        return {
                            label: label,
                            value: option
                        }
                    }
                }));
            }
            else {
                setStatusOptions([]);
            }
        }, [currentBuiltInFilter, builtInFilterOptions])

        return statusOptions;
    }

    const regionOptions = useRegions();
    function useRegions(): any[] | undefined {
        const [regionOptions, setRegionOptions] = React.useState<any[] | undefined>(undefined);

        React.useEffect(() => {
            if (employeeJobs && employeeJobs.length > 0) {
                var regions = employeeJobs.map(e => { if (e["_el_id_region_value"]) return "el_regionid eq '" + e["_el_id_region_value"] + "'"; });
                var filter = "?$select=el_s_region_name,el_regionid&$filter=" + regions.filter(x => x != undefined).join(" or ");

                context.webAPI.retrieveMultipleRecords("el_region", filter) // TODO cache by userId and filterbyisuk?
                    .then(function (response) {
                        const newOption = response.entities?.map(option => {
                            return {
                                label: option["el_s_region_name"],
                                value: option["el_regionid"]
                            };
                        });
                        setRegionOptions(newOption);
                    },
                        function (error) {
                            setRegionOptions([]);
                            console.log(error);
                        });
            }
            else {
                setRegionOptions([]);
            }
        }, []);

        return regionOptions;
    }

    const visitUnitStatusOptions = useVisitUnitStatuses();
    function useVisitUnitStatuses(): any[] | undefined {
        const [visitUnitStatusOptions, setVisitUnitStatusOptions] = React.useState<any[] | undefined>(undefined);

        React.useEffect(() => {

            var VisitUnitStatus = [{
                value: 2,
                label: "משויך ליחידה"
            },
            {
                value: 3,
                label: "לא משויך ליחידה"
            }
            ];

            setVisitUnitStatusOptions(VisitUnitStatus)
        }, []);

        return visitUnitStatusOptions;
    }

    //const caregiverOptions = useCaregivers();
    //function useCaregivers(): any[] | undefined {
    //    const [caregiverOptions, setCaregiverOptions] = React.useState<any[] | undefined>(undefined);

    //    React.useEffect(() => {
    //        if (employeeJobs && employeeJobs.length > 0) {
    //            const fetchXml = "<fetch version='1.0' output-format='xml-platform' mapping='logical' distinct='true'>" +
    //                "<entity name = 'systemuser'>" +
    //                    "<attribute name='systemuserid'/>" +
    //                    "<attribute name='fullname'/>" +
    //                    "<filter type='and'>" +
    //                        "<condition attribute='isdisabled' operator='eq' value='0'/>" +
    //                    "</filter>" +
    //                    "<link-entity name='el_person' from='el_systemuser_id' to='systemuserid' link-type='inner' alias='person'>" +
    //                        "<filter type='and'>" +
    //                        "<condition attribute='statecode' operator='eq' value='0'/>" +
    //                        "</filter>" +
    //                        "<link-entity name='el_employee_job' from='el_personid' to='el_personid' link-type='inner' alias='employeeJob'>" +
    //                            "<attribute name='el_id_region'/>" +
    //                            "<filter type='and'>" +
    //                            "<condition attribute='statecode' operator='eq' value='0'/>" +
    //                            "<condition attribute='el_id_region' operator='in'>" +
    //                            employeeJobs.map(e => {
    //                                if (e["_el_id_region_value"])
    //                                    return "<value>" + e["_el_id_region_value"] + "</value>";
    //                                return "";
    //                            }).join("") +
    //                            "</condition>" +
    //                            "</filter>" +
    //                            "<link-entity name='el_isuk' from='el_isukid' to='el_provider_specialityid' link-type='outer' alias='isuk'>" +
    //                                "<attribute name='el_isuk_group'/>" +
    //                                "<attribute name='el_isuk_group_2'/>" +
    //                            "</link-entity>" +
    //                        "</link-entity>" +
    //                    "</link-entity>" +
    //                    "<link-entity name='systemuserroles' from='systemuserid' to='systemuserid' link-type='inner' alias='systemuserroles'>" +
    //                    "<link-entity name='role' from='roleid' to='roleid' link-type='inner' alias='role'>" +
    //                    "<filter type='and'>" +
    //                    "<condition attribute='name' operator='eq' value='גורם מטפל'/>" + // TODO: param for role value
    //                    "</filter>" +
    //                    "</link-entity>" +
    //                    "</link-entity>" +
    //                    "</entity>" +
    //                "</fetch>";     

    //            context.webAPI.retrieveMultipleRecords(
    //                "systemuser",
    //                "?fetchXml=" + encodeURIComponent(fetchXml)
    //            ).then(function (response) {
    //                let caregivers = response.entities ?? [];

    //                if (!caregivers.length) {
    //                    setCaregiverOptions([]);
    //                    return;
    //                }

    //                if (context.parameters.filterByIsuk.raw == "true") {
    //                    caregivers = response.entities.filter(r => {
    //                        return userIsukGroups?.some(ig => r["employeeJob.el_id_region"] == ig.region
    //                            && ((r["isuk.el_isuk_group"] && ig.isukGroups.includes(r["isuk.el_isuk_group"])) || (r["isuk.el_isuk_group_2"] && ig.isukGroups.includes(r["isuk.el_isuk_group_2"])))) || false;
    //                    })
    //                }

    //                caregivers = distinctBy(caregivers, "systemuserid")

    //                const newOption = caregivers?.map(option => {
    //                    return {
    //                        label: option["fullname"],
    //                        value: option["systemuserid"]
    //                    };
    //                });
    //                setCaregiverOptions(newOption);
    //            },
    //                function (error) {
    //                    setCaregiverOptions([]);
    //                    console.log(error);
    //                });
    //        }
    //        else {
    //            setCaregiverOptions([]);
    //        }
    //    }, []);

    //    return caregiverOptions;
    //}

    //function distinctBy(arr: any[], prop: string) : any[] {
    //    const uniqueMap = new Map();
    //    for (const item of arr) {
    //        // If the property value hasn't been seen, add it to the Map.
    //        // Map keys are unique, so this handles the de-duplication.
    //        if (!uniqueMap.has(item[prop])) {
    //            uniqueMap.set(item[prop], item);
    //        }
    //    }
    //    // Return the unique objects as a new array
    //    return Array.from(uniqueMap.values());
    //}

    //function useCaregivers(): any[] | undefined {
    //    const [caregiverOptions, setCaregiverOptions] = React.useState<any[] | undefined>(undefined);

    //    React.useEffect(() => {

    //        const filter = dataset.filtering.getFilter();

    //        const fetchXml = `
    //    <fetch distinct="true">
    //        <entity name="${entityName}">
    //            <attribute name="el_id_user_owner" />
    //            ${filterToFetchXml(filter)}
    //        </entity>
    //    </fetch>`;

    //        context.webAPI.retrieveMultipleRecords(
    //            entityName,
    //            "?fetchXml=" + encodeURIComponent(fetchXml)
    //        ).then(function (response) {
    //            const newOption = response.entities?.map(option => {
    //                return {
    //                    label: option["_el_id_user_owner_value@OData.Community.Display.V1.FormattedValue"],
    //                    value: option["el_id_user_owner"]
    //                };
    //            });
    //            setCaregiverOptions(newOption);
    //        },
    //            function (error) {
    //                setCaregiverOptions([]);
    //                console.log(error);
    //            });
    //    }, [dataset.filtering]);

    //    return caregiverOptions;
    //}

    //function filterToFetchXml(
    //    filter?: ComponentFramework.PropertyHelper.DataSetApi.FilterExpression,
    //    entityAlias?: string
    //): string {

    //    if (!filter) return "";

    //    // In PCF DataSet filterOperator: 0 = And, 1 = Or (commonly)
    //    const type = filter.filterOperator === 1 ? "or" : "and";

    //    const conditionsXml = (filter.conditions ?? [])
    //        .map(cond => conditionToFetchXml(cond))
    //        .join("");

    //    const subFiltersXml = (filter.filters ?? [])
    //        .map(sf => filterToFetchXml(sf, entityAlias))
    //        .join("");

    //    // Return a complete filter node for THIS filter
    //    return `<filter type="${type}">${conditionsXml}${subFiltersXml}</filter>`;
    //}

    //function conditionToFetchXml(
    //    cond: ComponentFramework.PropertyHelper.DataSetApi.ConditionExpression,
    //    entityAlias?: string
    //): string {
    //    const attr = entityAlias ? `${entityAlias}.${cond.attributeName}` : cond.attributeName;
    //    const op = mapOperator(cond.conditionOperator);
    //    const value = cond.value;

    //    // Operators that typically don't require a value
    //    // (Add more if you encounter them: null, not-null, etc.)
    //    const noValueOperators = new Set<string>(["null", "not-null", "today", "yesterday", "tomorrow"]);
    //    if (noValueOperators.has(op)) {
    //        return `<condition attribute="${attr}" operator="${op}" />`;
    //    }

    //    // IN operator: value should be array
    //    if (op === "in" && Array.isArray(value)) {
    //        return `<condition attribute="${attr}" operator="in">
    //  ${value.map(v => `<value>${escapeXmlValue(v)}</value>`).join("")}
    //</condition>`;
    //    }

    //    // If value is null/undefined, emit operator-only condition (safer than <value>null</value>)
    //    if (value === null || value === undefined) {
    //        return `<condition attribute="${attr}" operator="${op}" />`;
    //    }

    //    return `<condition attribute="${attr}" operator="${op}" value="${escapeXmlValue(value)}"></condition>`;
    //}

    //function escapeXmlValue(v: any): string {
    //    // basic XML escaping
    //    return String(v)
    //        .replace(/&/g, "&amp;")
    //        .replace(/</g, "&lt;")
    //        .replace(/>/g, "&gt;")
    //        .replace(/"/g, "&quot;")
    //        .replace(/'/g, "&apos;");
    //}

    //function mapOperator(op: number): string {

    //    switch (op) {
    //        case 8: return "in";
    //        case 6: return "like";
    //        case 27: return "on-or-after";
    //        case 26: return "on-or-before";
    //        case 0: return "eq";
    //        case 1: return "ne";
    //        default: return "eq"; // fallback
    //    }
    //}

    const isukOptions = useIsuks();
    function useIsuks(): any[] | undefined {
        const [isukOptions, setIsukOptions] = React.useState<any[] | undefined>(undefined);

        React.useEffect(() => {
            if (context.parameters.ShowIsukFilter.raw == "true") {
                const filter = "?$select=el_s_profession_group_name,el_isuk_groupid&$filter=statecode eq 0"; // TODO cache by userId and filterbyisuk?

                context.webAPI.retrieveMultipleRecords("el_isuk_group", filter)
                    .then(function (response) {
                        const newOption = response.entities?.map(option => {
                            return {
                                label: option["el_s_profession_group_name"],
                                value: option["el_isuk_groupid"]
                            };
                        });
                        setIsukOptions(newOption);
                    },
                        function (error) {
                            setIsukOptions([]);
                            console.log(error);
                        });
            }
            else {
                setIsukOptions([]);
            }
        }, []);

        return isukOptions;
    }

    function useBuiltInFilterCount(paramName: string): any {
        const [builtInFilterCount, setBuiltInFilterCount] = React.useState("-1");

        useEffect(() => {
            let countRes = "0";
            if ((context.parameters.filterByIsuk.raw == "true" && userIsukGroups?.length == 0) || !paramName) {
                setBuiltInFilterCount(countRes);
            }
            else if (paramName) {
                var fetch = "?fetchXml=<fetch>" +
                    "<entity name = 'environmentvariabledefinition'>" +
                    "<attribute name = 'defaultvalue'/>" +
                    "<attribute name = 'schemaname'/>" +
                    "<attribute name = 'displayname'/>" +
                    "<filter>" +
                    "<condition attribute='displayname' operator='eq' value='" + paramName + "'/>" +
                    "</filter>" +
                    "<link-entity name='environmentvariablevalue' from='environmentvariabledefinitionid' to='environmentvariabledefinitionid' link-type='outer' alias='evv'>" +
                    "<attribute name='value'/>" +
                    "</link-entity>" +
                    "</entity>" +
                    "</fetch>";

                context.webAPI.retrieveMultipleRecords("environmentvariabledefinition", fetch)
                    .then(function (response) {
                        if (response && response.entities && response.entities.length > 0) {
                            const value = (response.entities[0]["evv.value"] || response.entities[0].defaultvalue)?.split(";") || [];
                            if (value) {
                                setBuiltInFilterOptions(oldArray => [...oldArray, { label: paramName, value: value }]);

                                var fetchXml = "?fetchXml=" +
                                    "<fetch mapping='logical' distinct='false' aggregate='true'>" +
                                    "<entity name='" + entityName + "'>" +
                                    "<attribute name='" + entityName + "id' alias='count' aggregate='count'/>" +
                                    "<filter type='and'>" +
                                    "<condition attribute='statuscode' operator='in'>" +
                                    value.map((v: any) => "<value>" + v + "</value>").join("") +
                                    "</condition>" +
                                    ((context.parameters.filterByIsuk.raw == "true") ? (
                                        "<filter type='or'>" +
                                        userIsukGroups?.map((group) => {
                                            return "<filter type='and'>" +
                                                "<condition attribute='el_id_isuk_group' operator='in'>" +
                                                group.isukGroups.map((isukGroup) => "<value>" + isukGroup + "</value>").join("") +
                                                "</condition>" +
                                                (group.approvalLevel === 1 ?
                                                    "<condition attribute='el_id_district' operator='eq' value='" + group.district + "'/>" :
                                                    "<condition attribute='el_id_region' operator='eq' value='" + group.region + "'/>") +
                                                "</filter>";
                                        }).join("") +
                                        "</filter>"
                                    ) : "") +
                                    "</filter>" +
                                    "</entity>" +
                                    "</fetch>";
                                context.webAPI.retrieveMultipleRecords(entityName, fetchXml)
                                    .then(function (res) {
                                        if (res && res.entities && res.entities.length > 0)
                                            countRes = res.entities[0]["count"];
                                        setBuiltInFilterCount(countRes);
                                    },
                                        function (err) {
                                            countRes = "+50000";
                                            setBuiltInFilterCount(countRes);
                                            console.log(err);
                                        });
                            }
                            else {
                                setBuiltInFilterCount(countRes);
                            }
                        }
                        else {
                            setBuiltInFilterCount(countRes);
                        }
                    },
                        function (error) {
                            console.log(error);
                            setBuiltInFilterCount(countRes);
                        });
            }
        }, []);

        return builtInFilterCount;
    }

    const uiKey = `ColorfulGrid_ui:${context.userSettings.userId}:` + // TODO
        `${context.parameters.filterByIsuk.raw || ""}:` +
        `${context.parameters.builtInFilterText1.raw || ""}`;

    // On mount/when dataset updates/options loaded:
    useEffect(() => { 
        // TODO if cachedFilter != null?
        const ui = CacheHelper.tryLoadJson<UIState>(uiKey);
        const filter = CacheHelper.tryLoadJson<ComponentFramework.PropertyHelper.DataSetApi.FilterExpression>(cacheFilterKey);
        if (ui && filter) {
            setSearchWordInput(ui.searchWord || "");
            setFromDate(ui.fromDate || "");
            setToDate(ui.toDate || "");

            // Map arrays to MultiSelect shapes using available options:
            setSelectedStatuses(mapToMultiSelect(ui.statusValues || [], statusOptions) as any);
            setSelectedPlaces(mapToMultiSelect(ui.regionValues || [], regionOptions) as any);
            setSelectedVisitUnitStatuses(mapToMultiSelect(ui.visitUnitStatusValues || [], visitUnitStatusOptions) as any);
            //setSelectedCaregivers(mapToMultiSelect(ui.caregiverValues || [], caregiverOptions) as any);
            setSelectedIsuks(mapToMultiSelect(ui.isukValues || [], isukOptions) as any);
            return;  // We’re done — super fast.
        }

        // Fallback: derive from saved/current dataset filter (your existing logic)
        // TODO exclude default filter:
        //const active = getActiveFilter();
        //const parsed = extractFilterState(active);
        //setSearchWordInput(parsed.searchWord || "");
        //setFromDate(parsed.fromDate || "");
        //setToDate(parsed.toDate || "");
        //setSelectedStatuses(mapToMultiSelect(parsed.statusValues, statusOptions) as any);
        //setSelectedPlaces(mapToMultiSelect(parsed.regionValues, regionOptions) as any);
        //setSelectedVisitUnitStatuses(mapToMultiSelect(parsed.visitUnitStatusValues, visitUnitStatusOptions) as any);
        //setSelectedCaregivers(mapToMultiSelect(parsed.caregiverValues, caregiverOptions) as any);
        //setSelectedIsuks(mapToMultiSelect(parsed.isukValues, isukOptions) as any);

        //TODO remove
        setSearchWordInput("");
        setFromDate("");
        setToDate("");
        setSelectedStatuses([]);
        setSelectedPlaces([]);
        setSelectedVisitUnitStatuses([]);
        //setSelectedCaregivers([]);
        setSelectedIsuks([]);
    }, [updatedProperties, statusOptions, regionOptions, /*caregiverOptions,*/ isukOptions, visitUnitStatusOptions]); // TODO check!!

    function getActiveFilter():
        ComponentFramework.PropertyHelper.DataSetApi.FilterExpression | null {
        try {
            const raw = sessionStorage.getItem(cacheFilterKey);
            if (raw) return JSON.parse(raw);
        } catch (err) {
            console.log(err);
            return null;
        }
        return context.parameters.dataset.filtering.getFilter() ?? null;
    }

    function flattenFilters(f?: ComponentFramework.PropertyHelper.DataSetApi.FilterExpression | null) {
        const all: ComponentFramework.PropertyHelper.DataSetApi.FilterExpression[] = [];
        if (!f) return all;
        const stack = [f];
        while (stack.length) {
            const cur = stack.pop()!;
            all.push(cur);
            if (cur.filters?.length) stack.push(...cur.filters);
        }
        return all;
    }

    function extractFilterState(
        f?: ComponentFramework.PropertyHelper.DataSetApi.FilterExpression | null
    ) {
        // TODO check how to exclude default filter
        const res = {
            fromDate: "",      // yyyy-MM-dd
            toDate: "",        // yyyy-MM-dd
            statusValues: [] as (string | number)[],
            regionValues: [] as string[],
            isukValues: [] as string[],
            searchWord: ""
        };
        if (!f) return res;

        const all = flattenFilters(f);
        for (const fx of all) {
            for (const c of fx.conditions ?? []) {
                // Dates
                if (c.attributeName === "el_dt_create_date" && typeof c.value === "string") {
                    if (c.conditionOperator === 27) res.fromDate = c.value; // on/after
                    if (c.conditionOperator === 26) res.toDate = c.value;   // on/before
                }
                // Status/Region/Isuk (IN)
                if (c.conditionOperator === 8 && Array.isArray(c.value)) {
                    if (c.attributeName === "statuscode") res.statusValues = c.value;
                    if (c.attributeName === "el_id_region") res.regionValues = c.value as string[];
                    if (c.attributeName === "el_id_isuk_group") res.isukValues = c.value as string[];
                }
                // LIKE (search)
                if (c.conditionOperator === 6 && typeof c.value === "string") {
                    // value like %text% — take first LIKE we find
                    const v = c.value.replace(/^%|%$/g, "");
                    if (v && !res.searchWord) res.searchWord = v;
                }
            }
        }

        return res;
    }

    // Map raw ids to MultiSelect option shape {label, value} using available options
    function mapToMultiSelect<T extends { label: string, value: any }>(
        raw: any[], options?: T[]
    ): T[] {
        if (!raw?.length || !options?.length) return [];
        const set = new Set(raw.map(String));
        return options.filter(o => set.has(String(o.value)));
    }


    const handleDetailsButtonClick = function (event: any, item: any) {
        event.stopPropagation();
    };

    const onChange = isEditable ? (id: string, columnName: string, value: number) => {
        console.log(`changing to ${value}`);
        const record = dataset.records[id];
        if (record) { //@ts-ignore
            record.setValue(columnName, value);
            //@ts-ignore
            record.save().then(() => { console.log(`record ${id} was saved`) }).catch(console.error);
        }
    } : undefined;

    const columns = gridColumns.map((column: IGridColumn): IColumn => {
        const isOptionSetRenderer: boolean = metadataAttributes?.has(column.original.name);
        const columnDefaultIcon = displayIconType === "NAME" ? defaultIconNames.get(column.original.name) ?? defaultIcon : defaultIcon;
        return {
            ...getDefaultColumnSetup(column, dataset),
            onRender: /* (customCols.indexOf(column.original.name) >= 0 || isOptionSetRenderer === true) ? */ (item: any) => {
                return <ColorfulCell
                    context={context}
                    item={{ item, handleDetailsButtonClick: (e: any) => { handleDetailsButtonClick(e, item) } }}
                    column={column}
                    metadataOptions={metadataAttributes.get(column.original.name)}
                    displayTextType={displayTextType}
                    displayIconType={displayIconType}
                    defaultIcon={columnDefaultIcon}
                    onChange={column.original.dataType === "TwoOptions" ? onChange : undefined}
                ></ColorfulCell>
            } /* : undefined */,
        };
    });

    function handleSelectPlaces(newValue: MultiValue<never>, actionMeta: ActionMeta<never>): void {
        setSelectedPlaces([...newValue]);
    }
    
    function handleSelectVisitUnitStatuses(newValue: MultiValue<never>, actionMeta: ActionMeta<never>): void {
        setSelectedVisitUnitStatuses([...newValue]);
    }

    //function handleSelectCaregivers(newValue: MultiValue<never>, actionMeta: ActionMeta<never>): void {
    //    setSelectedCaregivers([...newValue]);
    //}

    function handleSelectIsuks(newValue: MultiValue<never>, actionMeta: ActionMeta<never>): void {
        setSelectedIsuks([...newValue]);
    }

    function handleSelectStatus(newValue: MultiValue<never>, actionMeta: ActionMeta<never>): void {
        setSelectedStatuses([...newValue]);
    }

    function cleanAllFilters(event: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
        cleanInputs();
        cleanFilters();
        cleanUI();
    }

    function cleanUI() {
        sessionStorage.removeItem(uiKey);
    }

    function cleanInputs() : void {
        setSelectedGenders([]);
        setSelectedLanguages([]);
        setSelectedTimes([]);
        setSelectedQueueTypes([]);
        setSelectedCities([]);
        setApplyClientCityFilter(false);

        setSelectedPlaces([]);
        setSelectedVisitUnitStatuses([]);
        //setSelectedCaregivers([]);
        setSelectedIsuks([]);
        setSelectedStatuses([]);
        setFromDate("");
        setToDate("");
        setSearchWordInput("");
        setError(dashboardConfigurationError ?? "");
    }

    function cleanFilters(): void {
        if (isDashboardMode) {
            if (dashboardConfigurationError) return;
            const root: ComponentFramework.PropertyHelper.DataSetApi.FilterExpression = {
                conditions: [],
                filterOperator: 0,
                filters: []
            };
            addDashboardBaseFilters(root);

            CacheHelper.saveJson<ComponentFramework.PropertyHelper.DataSetApi.FilterExpression>(cacheFilterKey, root);
            context.parameters.dataset.filtering.setFilter(root);
            context.parameters.dataset.refresh();
            return;
        }

        let currentFilter = context.parameters.dataset.filtering.getFilter();
        if (currentFilter) {
            currentFilter.filters = [];
            if (subFilters && subFilters.filters) {
                currentFilter.filters.push(subFilters);
            }

            CacheHelper.saveJson<ComponentFramework.PropertyHelper.DataSetApi.FilterExpression>(cacheFilterKey, currentFilter);
            context.parameters.dataset.filtering.setFilter(currentFilter);
            context.parameters.dataset.refresh();
        }
    }

    function getSearchFilter(text: string, searchIn?: string): ComponentFramework.PropertyHelper.DataSetApi.FilterExpression {
        const filterOperator: ComponentFramework.PropertyHelper.DataSetApi.Types.FilterOperator = 1;
        const filter: ComponentFramework.PropertyHelper.DataSetApi.FilterExpression = { conditions: [], filterOperator, filters: [] };

        const configuredSearchableColumns: string[] = (
            (searchIn && searchIn !== "")
                ? searchIn.split(",")
                : context.parameters.searchableColumns?.raw?.split(",") || []
        ).map(s => s.trim()).filter(Boolean);

        const fallbackSearchableColumns = context.parameters.dataset.columns.filter(c =>
            c.dataType === "Lookup.Simple" ||
            c.dataType === "OptionSet" ||
            c.dataType === "SingleLine.Text" ||
            c.dataType === "Multiple"
        );

        const searchableColumns = configuredSearchableColumns.length > 0
            ? context.parameters.dataset.columns.filter(c => {
                const parts = c.name.split(".");
                const plainName = parts.length > 1 ? parts[1] : c.name;
                return configuredSearchableColumns.some(s => s === c.name || s === plainName);
            })
            : fallbackSearchableColumns;

        searchableColumns.forEach((searchableColumn: ComponentFramework.PropertyHelper.DataSetApi.Column) => {
            const aliasAndName = searchableColumn.name.split(".");
            let attributeName = (aliasAndName.length > 1) ? aliasAndName[1] : searchableColumn.name;
            switch (searchableColumn.dataType) {
                case "Lookup.Simple":
                case "OptionSet":
                    {
                        const condition: ComponentFramework.PropertyHelper.DataSetApi.ConditionExpression = {
                            attributeName: attributeName + "name",
                            conditionOperator: 6,
                            value: '%' + text + '%',
                        };
                        if (aliasAndName.length > 1) {
                            condition.entityAliasName = aliasAndName[0];
                        }
                        filter.conditions.push(condition);
                        break;
                    }
                case "SingleLine.Text":
                case "Multiple":
                    {
                        const condition: ComponentFramework.PropertyHelper.DataSetApi.ConditionExpression = {
                            attributeName: attributeName,
                            conditionOperator: 6,
                            value: '%' + text + '%',
                        };
                        if (aliasAndName.length > 1) {
                            condition.entityAliasName = aliasAndName[0];
                        }

                        filter.conditions.push(condition);
                        break;
                    }
                // case "DateAndTime.DateAndTime":
                // case "DateAndTime.DateOnly":
                // case "Currency":
                // case "TwoOptions":
                // case "Whole.None":
                // case "Decimal":
                // case "SingleLine.URL":
                // case "SingleLine.Ticker":
                // case "SingleLine.TextArea":
                // case "SingleLine.Phone":
                // case "SingleLine.Email":
                // case "MultiSelectOptionSet":
                // case "FP":
                // case "Enum":
                // case "Object":

                default:
                    break;
            }
        });

        return filter;
    }

    async function filterDataSet(ev: React.FormEvent<HTMLFormElement>): Promise<void> {
        ev.preventDefault();
        const data = new FormData(ev.currentTarget);
        const searchWord = data.get("searchWordInput")?.toString().trim() ?? "";

        if (isDashboardMode) {
            if (dashboardConfigurationError) return;
            setApplyClientCityFilter(selectedCities.length > 0 && !hasCityLinkAlias);
            const root: ComponentFramework.PropertyHelper.DataSetApi.FilterExpression = {
                conditions: [],
                filterOperator: 0,
                filters: []
            };

            addDashboardBaseFilters(root);

            const getConditionOperatorForAttribute = (attributeName: string, entityAliasName?: string): number => {
                const candidates = context.parameters.dataset.columns.filter((c) => {
                    if (entityAliasName) {
                        return c.name === `${entityAliasName}.${attributeName}`;
                    }
                    return c.name === attributeName || c.name.endsWith(`.${attributeName}`);
                });

                const dataType = candidates[0]?.dataType;
                if (dataType === "MultiSelectOptionSet" || dataType === "MultiSelectPicklist") {
                    // Dataverse "contain-values" for MultiSelect columns.
                    return 87;
                }

                return 8;
            };

            const addInFilter = (attributeName: string, values: any[], entityAliasName?: string) => {
                if (values.length === 0) return;
                root.conditions.push({
                    attributeName,
                    conditionOperator: getConditionOperatorForAttribute(attributeName, entityAliasName),
                    value: values,
                    entityAliasName
                });
            };

            addInFilter(genderAttribute, selectedGenders.map(s => s.value));
            addInFilter(languageAttribute, selectedLanguages.map(s => s.value));
            addInFilter(timeAttribute, selectedTimes.map(s => s.value));
            addInFilter(queueTypeAttribute, selectedQueueTypes.map(s => s.value));

            const selectedCityValues = selectedCities.map(s => String(s.value ?? "").trim()).filter(Boolean);
            const selectedCityLabels = selectedCities.map(s => String(s.label ?? "").trim()).filter(Boolean);
            const selectedCityGuids = selectedCityValues.filter(v => guidPattern.test(v));

            // Keep alias-based filtering when available.
            if (hasCityLinkAlias) {
                const selectedCityNames = selectedCityValues.filter(v => !guidPattern.test(v));
                if (selectedCityGuids.length > 0) {
                    addInFilter(cityLookupAttribute, selectedCityGuids, cityLinkAlias);
                }
                if (selectedCityNames.length > 0) {
                    addInFilter(`${cityLookupAttribute}name`, selectedCityNames, cityLinkAlias);
                }
            }

            // Alias-independent fallback: resolve incident IDs by selected city and filter directly on incidentid.
            if (selectedCities.length > 0) {
                const guidByLabel = new Map<string, string>();
                effectiveCityOptions.forEach((opt) => {
                    const value = String(opt.value ?? "").trim();
                    const label = String(opt.label ?? "").trim();
                    if (guidPattern.test(value) && label) {
                        guidByLabel.set(label.toLowerCase(), value);
                    }
                });

                const extraGuidsFromLabels = selectedCityLabels
                    .map((label) => guidByLabel.get(label.toLowerCase()))
                    .filter((v): v is string => !!v);

                const cityGuidsForResolution = Array.from(new Set([...selectedCityGuids, ...extraGuidsFromLabels]));
                if (cityGuidsForResolution.length > 0) {
                    const incidentIds = await resolveIncidentIdsByCityGuids(cityGuidsForResolution);
                    if (incidentIds && incidentIds.length > 0) {
                        addInFilter("incidentid", incidentIds);
                    } else if (incidentIds && incidentIds.length === 0) {
                        // Force empty result set when selected cities have no matching incidents.
                        root.conditions.push({ attributeName: "incidentid", conditionOperator: 0, value: "00000000-0000-0000-0000-000000000000" });
                    }
                }
            }

            if (searchWord) {
                root.filters.push(getSearchFilter(searchWord));
            }

            CacheHelper.saveJson<ComponentFramework.PropertyHelper.DataSetApi.FilterExpression>(cacheFilterKey, root);
            context.parameters.dataset.filtering.setFilter(root);
            context.parameters.dataset.refresh();
            return;
        }

        let currentFilter = context.parameters.dataset.filtering.getFilter();
        currentFilter.filters = [];
        if (subFilters && subFilters.filters) {
            currentFilter.filters.push(subFilters);
        }
        let searchWordValue = searchWord;
        let fromDate = data.get("fromDate");
        let toDate = data.get("toDate");
        let places = selectedPlaces.map(s => s["value"]);
        let visitUnitStatus = selectedVisitUnitStatuses.map(s => s["value"]);
        //let caregivers = selectedCaregivers.map(s => s["value"]);
        let isuks = selectedIsuks.map(s => s["value"]);
        let statuses = selectedStatuses.map(s => s["value"]);

        const filterOperator: ComponentFramework.PropertyHelper.DataSetApi.Types.FilterOperator = 0;
        const filter: ComponentFramework.PropertyHelper.DataSetApi.FilterExpression = { conditions: [], filterOperator: filterOperator, filters: [] };

        if (fromDate && fromDate != "") filter.conditions.push({ attributeName: "el_dt_create_date", conditionOperator: 27, value: fromDate.toString() });
        if (toDate && toDate != "") filter.conditions.push({ attributeName: "el_dt_create_date", conditionOperator: 26, value: toDate.toString() });
        if (places && places.length != 0) filter.conditions.push({ attributeName: "el_id_region", conditionOperator: 8, value: places });
        //if (caregivers && caregivers.length != 0) filter.conditions.push({ attributeName: "el_id_user_owner", conditionOperator: 8, value: caregivers });
        if (visitUnitStatus && visitUnitStatus.length != 0) {
            if (visitUnitStatus.includes(VisitUnitStatus.NotInUnit)) {
                visitUnitStatus.push(VisitUnitStatus.Empty);
            }
            var colName = context.parameters.dataset.columns.filter(c => c.name.includes("el_gp_status_visit_unit")).pop();
            if (colName) {
                const aliasAndName = colName.name.split(".");
                filter.conditions.push({ attributeName: aliasAndName[1], conditionOperator: 8, value: visitUnitStatus, entityAliasName: aliasAndName[0] });
            }
        }
        if (isuks && isuks.length != 0) filter.conditions.push({ attributeName: "el_id_isuk_group", conditionOperator: 8, value: isuks });
        if (statuses && statuses.length != 0) filter.conditions.push({ attributeName: "statuscode", conditionOperator: 8, value: statuses });
        if (searchWordValue != "") currentFilter.filters?.push(getSearchFilter(searchWordValue));

        if (filter.conditions.length != 0 || filter.filters?.length != 0) { currentFilter.filters?.push(filter); }

        CacheHelper.saveJson<UIState>(uiKey, {
            searchWord: searchWordValue,
            fromDate: fromDate?.toString(),
            toDate: toDate?.toString(),
            statusValues: statuses,
            regionValues: places,
            visitUnitStatusValues: visitUnitStatus,
            //caregiverValues: caregivers,
            isukValues: isuks
        });

        CacheHelper.saveJson<ComponentFramework.PropertyHelper.DataSetApi.FilterExpression>(cacheFilterKey, currentFilter);
        context.parameters.dataset.filtering.setFilter(currentFilter);
        context.parameters.dataset.refresh();
    }

    function addDashboardBaseFilters(root: ComponentFramework.PropertyHelper.DataSetApi.FilterExpression): void {
        if (requireActiveOnly) {
            root.conditions.push({ attributeName: "statecode", conditionOperator: 0, value: incidentActiveStateCode.toString() });
        }

        if (hasQueueItemAlias) {
            root.conditions.push({
                attributeName: "statecode",
                entityAliasName: queueItemAlias,
                conditionOperator: 0,
                value: waitingQueueItemStateCode.toString()
            });
            root.conditions.push({
                attributeName: "statuscode",
                entityAliasName: queueItemAlias,
                conditionOperator: 0,
                value: waitingQueueItemStatusCode.toString()
            });
        }

        if (dashboardQueueName && hasQueueAlias) {
            root.conditions.push({
                attributeName: "name",
                entityAliasName: queueAlias,
                conditionOperator: 0,
                value: dashboardQueueName.trim()
            });
        }
    }

    function filterDataSetByStatus(ev: React.MouseEvent<HTMLButtonElement, MouseEvent>): void {
        const btnClicked = ev.currentTarget.children[1].innerHTML;
        setCurrentBuiltInFilter(btnClicked);

        let currentFilter = context.parameters.dataset.filtering.getFilter();
        //currentFilter.conditions = [];

        let option = builtInFilterOptions?.filter(o => o.label == btnClicked) || undefined;
        if (option && option[0] && option[0].value) {
            currentFilter.conditions.filter(c => c.attributeName == 'statuscode')[0].value = option[0].value;
        }

        // TODO??
        //// 1) Which statuses are valid for the clicked built-in filter?
        //const selected = builtInFilterOptions?.find(o => o.label === btnClicked);
        //// TODO if selected
        //const validStatusValues = (selected?.value ?? []).map(String); // normalize to strings

        //// 2) Find all NESTED statuscode IN conditions (exclude root) and clean them
        //const hits = collectNestedStatusConditionsWithParents(currentFilter);

        //for (const { filterRef, condIndex, parentRef, idxInParent } of hits) {
        //    const cond = filterRef.conditions![condIndex];
        //    const cleaned = (cond.value as any[]).map(String).filter(v => validStatusValues.includes(v));
        //    cond.value = cleaned;

        //    // If cleaned is empty -> remove this condition
        //    if (cleaned.length === 0) {
        //        filterRef.conditions!.splice(condIndex, 1);

        //        // If the filter itself is now empty (no conditions AND no child filters), remove it from its parent
        //        const noConds = !filterRef.conditions || filterRef.conditions.length === 0;
        //        const noSubs = !filterRef.filters || filterRef.filters.length === 0;
        //        if (noConds && noSubs && parentRef?.filters && idxInParent != null && idxInParent >= 0) {
        //            parentRef.filters.splice(idxInParent, 1);
        //        }
        //    }
        //}

        // TODO? maybe not need if change to other button..
        //// 3) Sync the UI MultiSelect to valid values only
        //setSelectedStatuses(() => {
        //    return (prev => {
        //        const validSet = new Set(validStatusValues);
        //        return prev.filter((s: { value: any; }) => validSet.has(String(s.value)));
        //    })(selectedStatuses as any);
        //});

        //saveUIState(uiKey, {
        //    currentBuiltInFilter: btnClicked,
        //    statusValues: validStatusValues
        //});

        CacheHelper.saveJson<ComponentFramework.PropertyHelper.DataSetApi.FilterExpression>(cacheFilterKey, currentFilter);
        context.parameters.dataset.filtering.setFilter(currentFilter);
        context.parameters.dataset.refresh();
    }

    //function collectNestedStatusConditionsWithParents(
    //    root: ComponentFramework.PropertyHelper.DataSetApi.FilterExpression
    //) {
    //    type Node = {
    //        node: ComponentFramework.PropertyHelper.DataSetApi.FilterExpression,
    //        parent?: ComponentFramework.PropertyHelper.DataSetApi.FilterExpression,
    //        idxInParent?: number
    //    };

    //    const stack: Node[] = (root.filters ?? []).map((f, i) => ({ node: f, parent: root, idxInParent: i }));
    //    const hits: Array<{
    //        filterRef: ComponentFramework.PropertyHelper.DataSetApi.FilterExpression,
    //        condIndex: number,
    //        parentRef?: ComponentFramework.PropertyHelper.DataSetApi.FilterExpression,
    //        idxInParent?: number
    //    }> = [];

    //    while (stack.length) {
    //        const { node, parent, idxInParent } = stack.pop()!;

    //        // Collect statuscode IN(...) on this node
    //        if (Array.isArray(node.conditions) && node.conditions.length > 0) {
    //            const idx = node.conditions.findIndex(
    //                c => c.attributeName === "statuscode" && c.conditionOperator === 8 && Array.isArray(c.value)
    //            );
    //            if (idx >= 0) hits.push({ filterRef: node, condIndex: idx, parentRef: parent, idxInParent });
    //        }

    //        // Dive deeper
    //        if (node.filters?.length) {
    //            node.filters.forEach((child, i) => stack.push({ node: child, parent: node, idxInParent: i }));
    //        }
    //    }
    //    return hits;
    //}

    ///** Minimal UI state save (extend as needed) */
    //function saveUIState(key: string, state: { currentBuiltInFilter?: string; statusValues?: string[] }) {
    //    try {
    //        const prev = tryLoadJson<UIState>(key) ?? {};
    //        saveJson<UIState>(key, { ...prev, ...state });
    //    } catch (err) {
    //        console.log(err);
    //    }
    //}

    function validateFromDate(ev: React.ChangeEvent<HTMLInputElement>): void {
        ev.currentTarget.setCustomValidity("");
        setError("");
        setFromDate(ev.currentTarget.value);
        if (!ev.currentTarget.validity.valid) ev.currentTarget.value = "";
        else if (ev.currentTarget.validity.valid && ev.currentTarget.value != "" && toDate != "" && toDate < ev.currentTarget.value) {
            setError("'מתאריך' לא יכול להיות גדול מ'עד תאריך'");
        }
    }

    function validateToDate(ev: React.ChangeEvent<HTMLInputElement>): void {
        ev.currentTarget.setCustomValidity("");
        setError("");
        setToDate(ev.currentTarget.value);
        if (!ev.currentTarget.validity.valid) ev.currentTarget.value = "";
        else if (ev.currentTarget.validity.valid && ev.currentTarget.value != "" && fromDate != "" && fromDate > ev.currentTarget.value) {
            setError("'עד תאריך' לא יכול להיות גדול מ'מתאריך'");
        }
    }

    function IsLoading() {
        if (isDashboardMode) return false;
        return !(builtInFilterCount1 != undefined
            && builtInFilterCount1 != -1
            && builtInFilterCount2 != undefined
            && builtInFilterCount2 != -1
            && regionOptions != undefined
            && visitUnitStatusOptions != undefined
            //&& caregiverOptions != undefined
            && statusOptions != undefined);
    }


    return (<>
        {(IsLoading()) && <LoadingGIF />}
        {(!IsLoading()) && <div className='ColorfulOptionsetGrid pcf-container'>
            {isDashboardMode ? (
                <div className='ColorfulOptionsetGrid header-bar'>
                    <div className='title'>רשימת בקשות לטיפול</div>
                </div>
            ) : context.parameters.showSearchAndFilters.raw == "true" && (
                <div className='ColorfulOptionsetGrid header-bar'>
                    <div className='ColorfulOptionsetGrid built-in-filters'>
                        <button className={`built-in-filter-btn ${currentBuiltInFilter === (context.parameters.builtInFilterText1?.raw ?? "") ? "clicked" : ""}`} onClick={filterDataSetByStatus}>
                            <label className='built-in-filter-count'>{builtInFilterCount1}</label>
                            <label className='built-in-filter-text' title={context.parameters.builtInFilterText1?.raw ?? ""}>{context.parameters.builtInFilterText1?.raw ?? ""}</label>
                        </button>
                        <button className={`built-in-filter-btn ${currentBuiltInFilter === (context.parameters.builtInFilterText2?.raw ?? "") ? "clicked" : ""}`} onClick={filterDataSetByStatus}>
                            <label className='built-in-filter-count'>{builtInFilterCount2}</label>
                            <label className='built-in-filter-text' title={context.parameters.builtInFilterText2?.raw ?? ""}>{context.parameters.builtInFilterText2?.raw ?? ""}</label>
                        </button>
                        <button className={`built-in-filter-btn ${currentBuiltInFilter === (context.parameters.builtInFilterText4?.raw ?? "") ? "clicked" : ""}`} onClick={filterDataSetByStatus}>
                            <span className='built-in-filter-icon' aria-hidden="true">#</span>
                            <label className='built-in-filter-text' title={context.parameters.builtInFilterText4?.raw ?? ""}>{context.parameters.builtInFilterText4?.raw ?? ""}</label>
                        </button>
                    </div>
                </div>)}
            {context.parameters.showSearchAndFilters.raw == "true" && (
                <div className='ColorfulOptionsetGrid filter-line'>
                    <label className="ColorfulOptionsetGrid error-label" hidden={error == ""}><span hidden={error == ""} className="error-icon" aria-hidden="true">!</span>{error}</label>
                    {isDashboardMode && showDashboardFilters && (
                        <form className='ColorfulOptionsetGrid filters-bar' onSubmit={filterDataSet} noValidate>
                            <input className='ColorfulOptionsetGrid search-word-input' name="searchWordInput" type='search' value={searchWordInput}
                                onChange={(e) => setSearchWordInput(e.currentTarget.value)} placeholder='חיפוש כללי'></input>
                            <div className="ColorfulOptionsetGrid form-group">
                                <label>מגדר</label>
                                <MultiSelect key="gender_filter" options={genderOptions} onChange={(v) => setSelectedGenders([...v])} value={selectedGenders} isSelectAll={true} menuPlacement={"bottom"} />
                            </div>
                            <div className="ColorfulOptionsetGrid form-group">
                                <label>שפה</label>
                                <MultiSelect key="language_filter" options={languageOptions} onChange={(v) => setSelectedLanguages([...v])} value={selectedLanguages} isSelectAll={true} menuPlacement={"bottom"} />
                            </div>
                            <div className="ColorfulOptionsetGrid form-group">
                                <label>שעה</label>
                                <MultiSelect key="time_filter" options={timeOptions} onChange={(v) => setSelectedTimes([...v])} value={selectedTimes} isSelectAll={true} menuPlacement={"bottom"} />
                            </div>
                            <div className="ColorfulOptionsetGrid form-group">
                                <label>סוג תור</label>
                                <MultiSelect key="queue_type_filter" options={queueTypeOptions} onChange={(v) => setSelectedQueueTypes([...v])} value={selectedQueueTypes} isSelectAll={true} menuPlacement={"bottom"} />
                            </div>
                            <div className="ColorfulOptionsetGrid form-group">
                                <label>עיר</label>
                                <MultiSelect key="city_filter" options={effectiveCityOptions} onChange={(v) => setSelectedCities([...v])} value={selectedCities} isSelectAll={true} menuPlacement={"bottom"} />
                            </div>
                            <button disabled={error != ""} type="submit" className={(error != "") ? 'ColorfulOptionsetGrid search-btn disabled' : 'ColorfulOptionsetGrid search-btn'}>חיפוש</button>
                            <button type="reset" className='ColorfulOptionsetGrid clean-btn' onClick={cleanAllFilters}>ניקוי</button>
                        </form>
                    )}
                    {!isDashboardMode && (
                    <form className='ColorfulOptionsetGrid filters-bar' onSubmit={filterDataSet} noValidate>
                        <input className='ColorfulOptionsetGrid search-word-input' name="searchWordInput" type='search' onInvalid={ev => ev.currentTarget.setCustomValidity("שדה 'חיפוש כללי' לא תקין")} onInput={ev => ev.currentTarget.setCustomValidity("")} value={searchWordInput}
                            onChange={(e) => setSearchWordInput(e.currentTarget.value)} placeholder='חיפוש כללי'></input>
                        <div className="ColorfulOptionsetGrid form-group input-date">
                            <label>מתאריך</label>
                            <input type="date" name='fromDate' value={fromDate} className={fromDate == "" ? 'ColorfulOptionsetGrid empty-date' : ""} onChange={validateFromDate}></input>
                        </div>
                        <div className="ColorfulOptionsetGrid form-group input-date">
                            <label>עד תאריך</label>
                            <input type="date" name='toDate' value={toDate} className={toDate == "" ? 'ColorfulOptionsetGrid empty-date' : ""} onChange={validateToDate}></input>
                        </div>
                        <div className="ColorfulOptionsetGrid form-group">
                            <label>סטטוס</label>
                            <MultiSelect
                                key="status_filter"
                                options={statusOptions}
                                onChange={handleSelectStatus}
                                value={selectedStatuses}
                                isSelectAll={true}
                                menuPlacement={"bottom"}
                            />
                        </div>
                        <div className="ColorfulOptionsetGrid form-group">
                            <label>מרחב</label>
                            <MultiSelect
                                key="region_filter"
                                options={regionOptions}
                                onChange={handleSelectPlaces}
                                value={selectedPlaces}
                                isSelectAll={true}
                                menuPlacement={"bottom"}
                            />
                        </div>
                        <div className="ColorfulOptionsetGrid form-group">
                            <label>שיוך ליחידה</label>
                            <MultiSelect
                                key="visitUnitStatus_filter"
                                options={visitUnitStatusOptions}
                                onChange={handleSelectVisitUnitStatuses}
                                value={selectedVisitUnitStatuses}
                                isSelectAll={true}
                                menuPlacement={"bottom"}
                            />
                        </div>
                        {/*<div className="ColorfulOptionsetGrid form-group">*/}
                        {/*    <label>גורם מטפל</label>*/}
                        {/*    <MultiSelect*/}
                        {/*        key="caregiver_filter"*/}
                        {/*        options={caregiverOptions}*/}
                        {/*        onChange={handleSelectCaregivers}*/}
                        {/*        value={selectedCaregivers}*/}
                        {/*        isSelectAll={true}*/}
                        {/*        menuPlacement={"bottom"}*/}
                        {/*    />*/}
                        {/*</div>*/}
                        {(context.parameters.ShowIsukFilter.raw == "true")
                            && (<div className="ColorfulOptionsetGrid form-group">
                                <label>תחום</label>
                                <MultiSelect
                                    key="isuk_filter"
                                    options={isukOptions}
                                    onChange={handleSelectIsuks}
                                    value={selectedIsuks}
                                    isSelectAll={true}
                                    menuPlacement={"bottom"}
                                />
                            </div>
                            )}
                        <button disabled={error != ""} type="submit" className={(error != "") ? 'ColorfulOptionsetGrid search-btn disabled' : 'ColorfulOptionsetGrid search-btn'}><img className="ColorfulOptionsetGrid search-icon" src={(error != "") ? '/WebResources/el_search_icon.png' : '/WebResources/el_search_icon_blue.png'}></img>חיפוש</button>
                        <button type="reset" className='ColorfulOptionsetGrid clean-btn' onClick={cleanAllFilters}>ניקוי</button>
                    </form>
                    )}
                    {/* <div className='ColorfulOptionsetGrid filter-bar-left-side'> */}
                    {/* <button className="ColorfulOptionsetGrid excel-btn" onClick={exportToExcel}><img className="ColorfulOptionsetGrid excel-icon" src='/WebResources/el_excel_icon.png' title='ייצוא לאקסל'></img></button> */}
                    {/* </div> */}
                </div>)}
            <div className="flexbox ColorfulOptionsetGrid grid" /* style={style} */ >
                {/* {popup.visible && < Popup {...{ ...popup }} />}       */}
                <GridOverlay
                    containerHeight={containerHeight} dataset={dataset} isSubgrid={isSubgrid}
                    selectedCount={selectedCount} selection={selection}
                    setFullScreen={setFullScreen} updatedProperties={updatedProperties}>
                    {(filteredItems && filteredItems.length > 0) ? (
                        <DetailsList
                            setKey="items"
                            onRenderDetailsHeader={gridHeader(onColumnClick)}
                            items={filteredItems}
                            columns={columns}
                            selection={selection}
                            selectionPreservedOnEmptyClick={true}
                            selectionMode={SelectionMode.none}
                            layoutMode={DetailsListLayoutMode.justified}
                            constrainMode={ConstrainMode.unconstrained}
                            onItemInvoked={onItemInvoked}
                            ariaLabelForSelectionColumn="Toggle selection"
                            ariaLabelForSelectAllCheckbox="Toggle selection for all items"
                        />
                    ) : (
                        <div
                            style={{
                                textAlign: 'center',
                                color: '#0866C4',
                                fontWeight: 'bold',
                                marginTop: '100px',
                                fontSize: '25px'
                            }} >{"לא נמצאו בקשות לטיפול"}</div>)
                    }
                </GridOverlay >
            </div>
        </div>}
    </>
    );
};