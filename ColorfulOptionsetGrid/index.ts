import { IInputs, IOutputs } from "./generated/ManifestTypes";

type Rec = ComponentFramework.PropertyHelper.DataSetApi.EntityRecord;
type FilterKey = "gender" | "language" | "day" | "time" | "queueType" | "city";

type FieldDefinition = {
  key: FilterKey;
  label: string;
  attribute: string;
};

export class ColorfulOptionsetGrid implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  private container!: HTMLDivElement;
  private context!: ComponentFramework.Context<IInputs>;
  private appliedFilters: Partial<Record<FilterKey, string>> = {};
  private readonly fields: FieldDefinition[] = [
    { key: "gender", label: "מגדר", attribute: "mac_p_member_gender" },
    { key: "language", label: "שפה", attribute: "mac_p_preferred_language" },
    { key: "day", label: "יום", attribute: "mac_p_preffered_day" },
    { key: "time", label: "שעה", attribute: "mac_p_preferred_time" },
    { key: "queueType", label: "סוג תור", attribute: "mac_p_preferred_queue_type" },
    { key: "city", label: "עיר", attribute: "ey_cityid" }
  ];

  public init(context: ComponentFramework.Context<IInputs>, _notify: () => void, _state: ComponentFramework.Dictionary, container: HTMLDivElement): void {
    this.context = context;
    this.container = container;
    this.container.className = "mac-pcf-dashboard";
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    this.context = context;
    this.render();
  }

  private getFormattedValue(record: Rec, attribute: string): string {
    return record.getFormattedValue(attribute) || "";
  }

  private escape(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  private getPriority(record: Rec): number {
    const rawValue = record.getValue("prioritycode");
    return typeof rawValue === "number" ? rawValue : Number.MAX_SAFE_INTEGER;
  }

  private getDatasetRecords(): Rec[] {
    const dataset = this.context.parameters.dataset;
    return dataset.sortedRecordIds
      .map((id) => dataset.records[id])
      .filter((record): record is Rec => Boolean(record));
  }

  private render(): void {
    const dataset = this.context.parameters.dataset;
    const isLoading = dataset.loading;
    const records = this.getDatasetRecords();
    const filtered = records
      .filter((record) => this.fields.every((field) => !this.appliedFilters[field.key] || this.getFormattedValue(record, field.attribute) === this.appliedFilters[field.key]))
      .sort((left, right) => this.getPriority(left) - this.getPriority(right));

    let controls = "";
    this.fields.forEach((field) => {
      const values = Array.from(new Set(records.map((record) => this.getFormattedValue(record, field.attribute)).filter(Boolean))).sort((left, right) => left.localeCompare(right, "he"));
      controls += "<label class=\"mac-filter\"><span>" + field.label + "</span><select data-filter=\"" + field.key + "\"><option value=\"\">הכול</option>";
      values.forEach((value) => { controls += "<option value=\"" + this.escape(value) + "\">" + this.escape(value) + "</option>"; });
      controls += "</select></label>";
    });

    let rows = "";
    filtered.forEach((record) => {
      rows += "<tr data-id=\"" + this.escape(record.getRecordId()) + "\">";
      rows += "<td>" + this.escape(this.getFormattedValue(record, "ticketnumber")) + "</td>";
      rows += "<td>" + this.escape(this.getFormattedValue(record, "prioritycode")) + "</td>";
      this.fields.forEach((field) => { rows += "<td>" + this.escape(this.getFormattedValue(record, field.attribute)) + "</td>"; });
      rows += "<td>" + this.escape(this.getFormattedValue(record, "statuscode")) + "</td></tr>";
    });
    if (!rows && !isLoading) rows = "<tr><td colspan=\"9\">לא נמצאו בקשות מתאימות</td></tr>";

    this.container.innerHTML =
      "<section class=\"mac-pcf-dashboard\" dir=\"rtl\"><header class=\"mac-header\"><div><h2>בקשות ממתינות לטיפול</h2><span>" + filtered.length + " בקשות</span></div><span class=\"mac-mode\">" + this.escape(this.context.parameters.queueMode.raw || "") + "</span></header>" +
      "<div class=\"mac-filters\">" + controls + "<button type=\"button\" class=\"mac-search\" data-search>חפש</button><button type=\"button\" class=\"mac-clear\" data-clear>נקה חיפוש</button></div>" +
      (isLoading ? "<div class=\"mac-state\">טוען בקשות טיפול...</div>" : "<div class=\"mac-table-wrap\"><table><thead><tr><th>מספר בקשה</th><th>עדיפות</th><th>מגדר</th><th>שפה</th><th>יום</th><th>שעה</th><th>סוג תור</th><th>עיר</th><th>סטטוס</th></tr></thead><tbody>" + rows + "</tbody></table></div>") + "</section>";

    this.container.querySelector("[data-search]")?.addEventListener("click", () => {
      this.container.querySelectorAll<HTMLSelectElement>("[data-filter]").forEach((select) => {
        const key = select.dataset.filter as FilterKey | undefined;
        if (key) this.appliedFilters[key] = select.value;
      });
      this.render();
    });
    this.container.querySelector("[data-clear]")?.addEventListener("click", () => {
      this.appliedFilters = {};
      this.render();
    });
    this.container.querySelectorAll<HTMLTableRowElement>("tbody tr[data-id]").forEach((row) => row.addEventListener("dblclick", () => {
      if (row.dataset.id) this.context.navigation.openForm({ entityName: "incident", entityId: row.dataset.id });
    }));
  }

  public getOutputs(): IOutputs { return {}; }
  public destroy(): void { this.container.innerHTML = ""; }
}
