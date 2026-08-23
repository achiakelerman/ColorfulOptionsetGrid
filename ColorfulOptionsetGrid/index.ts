
import { IInputs, IOutputs } from "./generated/ManifestTypes";

type Rec = ComponentFramework.PropertyHelper.DataSetApi.EntityRecord;

export default class ColorfulOptionsetGrid implements ComponentFramework.StandardControl<IInputs, IOutputs> {
  private container!: HTMLDivElement;
  private context!: ComponentFramework.Context<IInputs>;
  private filters: { [key: string]: string } = {};

  public init(context: ComponentFramework.Context<IInputs>, _notify: () => void, _state: ComponentFramework.Dictionary, container: HTMLDivElement): void {
    this.context = context;
    this.container = container;
    this.container.className = "mac-pcf-dashboard";
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    this.context = context;
    this.render();
  }

  private getValue(record: Rec, names: string[]): string {
    for (const name of names) {
      try {
        const raw = record.getValue(name);
        if (raw !== null && raw !== undefined && String(raw) !== "") return String(raw);
        const formatted = record.getFormattedValue(name);
        if (formatted) return formatted;
      } catch (_) {}
    }
    return "";
  }

  private escape(value: string): string {
    return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;");
  }
  private render(): void {
    const dataset = this.context.parameters.dataset;
    const records: Rec[] = dataset.sortedRecordIds.map(id => dataset.records[id]).filter(Boolean);
    const definitions = [
      { key: "gender", label: "מגדר", names: ["mac_p_member_gender", "mac_p_gender"] },
      { key: "language", label: "שפה", names: ["mac_p_preferred_language", "mac_p_language"] },
      { key: "day", label: "יום", names: ["mac_p_preffered_day", "mac_p_preferred_day"] },
      { key: "time", label: "שעה", names: ["mac_p_preferred_time"] },
      { key: "queue", label: "סוג תור", names: ["mac_p_preferred_queue_type", "mac_p_queue_type"] },
      { key: "city", label: "עיר", names: ["ey_cityid", "mac_p_city", "mac_city"] }
    ];

    const filtered = records.filter(record => definitions.every(field => !this.filters[field.key] || this.getValue(record, field.names) === this.filters[field.key]));
    filtered.sort((a, b) => Number(this.getValue(b, ["prioritycode"])) - Number(this.getValue(a, ["prioritycode"])));

    let controls = "";
    definitions.forEach(field => {
      const values = Array.from(new Set(records.map(record => this.getValue(record, field.names)).filter(Boolean))).sort();
      controls += "<label class="mac-filter">" + field.label + "<select data-filter="" + field.key + ""><option value="">הכול</option>";
      values.forEach(value => { controls += "<option value="" + this.escape(value) + "">" + this.escape(value) + "</option>"; });
      controls += "</select></label>";
    });

    let rows = "";
    filtered.forEach(record => {
      rows += "<tr data-id="" + this.escape(record.getRecordId()) + "">";
      rows += "<td>" + this.escape(this.getValue(record, ["title", "ticketnumber", "incidentid"])) + "</td>";
      rows += "<td>" + this.escape(this.getValue(record, ["mac_p_member_gender", "mac_p_gender"])) + "</td>";
      rows += "<td>" + this.escape(this.getValue(record, ["mac_p_preferred_language", "mac_p_language"])) + "</td>";
      rows += "<td>" + this.escape(this.getValue(record, ["mac_p_preffered_day", "mac_p_preferred_day"])) + "</td>";
      rows += "<td>" + this.escape(this.getValue(record, ["mac_p_preferred_time"])) + "</td>";
      rows += "<td>" + this.escape(this.getValue(record, ["mac_p_preferred_queue_type", "mac_p_queue_type"])) + "</td>";
      rows += "<td>" + this.escape(this.getValue(record, ["ey_cityid", "mac_p_city", "mac_city"])) + "</td>";
      rows += "<td class="priority">" + this.escape(this.getValue(record, ["prioritycode"])) + "</td></tr>";
    });
    if (!rows) rows = "<tr><td colspan="8">לא נמצאו בקשות מתאימות</td></tr>";

    this.container.innerHTML =
      "<section dir="rtl"><header class="mac-header"><div><h2>בקשות ממתינות לטיפול</h2><span>" + filtered.length + " בקשות</span></div><button type="button" data-search>חפש</button></header>" +
      "<div class="mac-filters">" + controls + "</div><div class="mac-table-wrap"><table><thead><tr><th>בקשה</th><th>מגדר</th><th>שפה</th><th>יום</th><th>שעה</th><th>סוג תור</th><th>עיר</th><th>PriorityCode</th></tr></thead><tbody>" + rows + "</tbody></table></div></section>";

    this.container.querySelector("[data-search]")?.addEventListener("click", () => {
      this.container.querySelectorAll<HTMLSelectElement>("[data-filter]").forEach(select => { this.filters[select.dataset.filter || ""] = select.value; });
      this.render();
    });
    this.container.querySelectorAll<HTMLTableRowElement>("tbody tr[data-id]").forEach(row => row.addEventListener("dblclick", () => {
      if (row.dataset.id) this.context.navigation.openForm({ entityName: "incident", entityId: row.dataset.id });
    }));
  }

  public getOutputs(): IOutputs { return {}; }
  public destroy(): void { this.container.innerHTML = ""; }
}
