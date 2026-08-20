// @ts-nocheck
/// <reference types="powerapps-component-framework" />
import { IInputs, IOutputs } from "./generated/ManifestTypes";
import * as React from "react";
import { ColorfulGrid, IColorfulGridProps, IsukGroup, CacheHelper} from "./App/ColorfulGrid";
import LoadingGIF from "./App/Controls/LoadingGIF";


export class ColorfulOptionsetGrid implements ComponentFramework.ReactControl<IInputs, IOutputs> {

    private _container: HTMLDivElement;
    private fullScreenUpdatedProperties = ["fullscreen_open", "fullscreen_close"];
    private _employeeJobs: ComponentFramework.WebApi.Entity[] | undefined = undefined;
    private subFilters: ComponentFramework.PropertyHelper.DataSetApi.FilterExpression;
    private _userIsukGroups: IsukGroup[] | undefined = undefined;
    private _isLoading: boolean = true;
    private _cacheEmployeeKey: string;
    private _cacheIsukGroupsKey: string;
    private _cacheFilterKey: string;
    private _cacheSubFilterKey: string;
    private _isDashboardMode: boolean = false;

    constructor() {

    }

    /**
     * Used to initialize the control instance. Controls can kick off remote server calls and other initialization actions here.
     * Data-set values are not initialized here, use updateView.
     * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to property names defined in the manifest, as well as utility functions.
     * @param notifyOutputChanged A callback method to alert the framework that the control has new outputs ready to be retrieved asynchronously.
     * @param state A piece of data that persists in one session for a single user. Can be set at any point in a controls life cycle by calling 'setControlState' in the Mode interface.
     * @param container If a control is marked control-type='standard', it will receive an empty div element within which it can render its content.
     */
    public init(context: ComponentFramework.Context<IInputs>, notifyOutputChanged: () => void, state: ComponentFramework.Dictionary, container: HTMLDivElement) {
        // set default filter
        this._isLoading = true;
        this._container = container;
        context.mode.trackContainerResize(true);

        const filterOperator: ComponentFramework.PropertyHelper.DataSetApi.Types.FilterOperator = 0;
        const filter: ComponentFramework.PropertyHelper.DataSetApi.FilterExpression = {
            conditions: [], filterOperator: filterOperator, filters: []
        };

        const filterByIsuk = context.parameters.filterByIsuk.raw === "true";
        const userId = context.userSettings.userId;
        this._cacheFilterKey = this.buildFilterCacheKey(context);
        this._cacheSubFilterKey = CacheHelper.buildCacheKey(context, "subFilters");
        this._cacheEmployeeKey = CacheHelper.buildCacheKey(context, "employeeJobs");
        this._cacheIsukGroupsKey = CacheHelper.buildCacheKey(context, "userIsukGroups");
        this._isDashboardMode = this.isDashboardMode(context);

        if (this._isDashboardMode) {
            this._employeeJobs = [];
            this._userIsukGroups = [];
            this.subFilters = { conditions: [], filterOperator: 0, filters: [] };
            this.applyDashboardBaseFilter(context);
            return;
        }

        this._employeeJobs = CacheHelper.tryLoadJson<ComponentFramework.WebApi.Entity[]>(this._cacheEmployeeKey) ?? undefined;
        this._userIsukGroups = CacheHelper.tryLoadJson<IsukGroup[]>(this._cacheIsukGroupsKey) ?? undefined;

        if (this._employeeJobs && ((context.parameters.filterByIsuk.raw == "true" && this._userIsukGroups) || context.parameters.filterByIsuk.raw != "true")) {
            this.applyCachedOrBuildFilter(context, filter);
        }
        else {
            const employeeFilter = "?fetchXml=<fetch version='1.0' output-format='xml - platform' mapping='logical' distinct='false'>" +
                "<entity name = 'el_employee_job'>" +
                "<attribute name='el_employee_jobid'/>" +
                "<attribute name='el_id_region'/>" +
                "<attribute name='el_pl_approve_level'/>" +
                "<attribute name='el_id_district'/>" +
                "<filter type='and'>" +
                "<condition attribute='statecode' operator='eq' value='0'/>" +
                ((filterByIsuk == true) ? (
                    "<condition attribute='el_b_isapproover' operator='eq' value='1'/>" +
                    "<condition attribute='el_pl_approve_level' operator='not-null'/>" 
                ) : "") +
                "</filter>" +
                "<link-entity name='el_person' from='el_personid' to='el_personid' link-type='inner' alias='person'>" +
                "<filter type='and'>" +
                "<condition attribute='statecode' operator='eq' value='0'/>" +
                "<condition attribute='el_systemuser_id' operator='eq' value='" + userId + "'/>" +
                "</filter>" +
                "</link-entity>" +
                "<link-entity name='el_isuk' from='el_isukid' to='el_provider_specialityid' link-type='inner' alias='isuk'>" +
                "<attribute name='el_isuk_group'/>" +
                "<attribute name='el_isuk_group_2'/>" +
                "</link-entity>" +
                "</entity>" +
                "</fetch>";

            context.webAPI.retrieveMultipleRecords("el_employee_job", employeeFilter).then(async (res) => {
                this._userIsukGroups = [];
                this._employeeJobs = (res?.entities ?? []) as ComponentFramework.WebApi.Entity[];

                if (context.parameters.filterByIsuk.raw === "true") {
                    this._employeeJobs.forEach(r => {
                        const groups: any[] = [];
                        if (r["isuk.el_isuk_group"]) groups.push(r["isuk.el_isuk_group"]);
                        if (r["isuk.el_isuk_group_2"]) groups.push(r["isuk.el_isuk_group_2"]);

                        this._userIsukGroups?.push({
                            region: r["_el_id_region_value"] ?? null,
                            district: r["_el_id_district_value"] ?? null,
                            approvalLevel: r["el_pl_approve_level"] ?? null,
                            isukGroups: groups
                        });
                    });
                }

                CacheHelper.saveJson<ComponentFramework.WebApi.Entity[]>(this._cacheEmployeeKey, this._employeeJobs);
                CacheHelper.saveJson<IsukGroup[]>(this._cacheIsukGroupsKey, this._userIsukGroups);

                this.applyCachedOrBuildFilter(context, filter);
            }, (error) => {
                console.log(error);

                if (!this._employeeJobs) this._employeeJobs = [];
                if (!this._userIsukGroups) this._userIsukGroups = [];

                // default filter that return 0
                filter.conditions.push({ attributeName: "el_s_home_visit_task_id", conditionOperator: 0, value: "-1" });

                // TODO saveFilter?
                context.parameters.dataset.filtering.setFilter(filter);
                context.parameters.dataset.paging.setPageSize(window.innerWidth <= 1366 ? 6 : 11);
                context.parameters.dataset.refresh();
                this._isLoading = false;
            });
        }
    }

    /**
     * Called when any value in the property bag has changed. This includes field values, data-sets, global values such as container height and width, offline status, control metadata values such as label, visible, etc.
     * @param context The entire property bag available to control via Context Object; It contains values as set up by the customizer mapped to names defined in the manifest, as well as utility functions
     */
    public updateView(context: ComponentFramework.Context<IInputs>): React.ReactElement {
        console.log(context.updatedProperties);

        if (this._isDashboardMode && !this._isLoading) {
            const props: IColorfulGridProps = {
                context: context,
                dataset: context.parameters.dataset,
                utils: context.utils,
                displayTextType: context.parameters.displayTextType?.raw ?? "SIMPLE",
                displayIconType: context.parameters.displayTextType?.raw !== "NOTEXT" ? context.parameters.displayIconType?.raw ?? "NAME" : "NAME",
                defaultIcon: context.parameters.defaultIcon?.raw ?? "CircleShapeSolid",
                iconConfig1: context.parameters.iconConfig1?.raw ?? undefined,
                iconConfig2: context.parameters.iconConfig2?.raw ?? undefined,
                iconConfig3: context.parameters.iconConfig3?.raw ?? undefined,
                containerWidth: (context.mode.allocatedWidth != -1) ? context.mode.allocatedWidth : (window.innerWidth - 109),
                containerHeight: context.mode.allocatedHeight,
                isSubgrid: (context.parameters as any).autoExpand != null,
                setFullScreen: context.mode.setFullScreen,
                isEditable: context.parameters.isEditable.raw === "Editable",
                employeeJobs: [],
                userIsukGroups: [],
                subFilters: this.subFilters,
                cacheFilterKey: this._cacheFilterKey,
                updatedProperties: context.updatedProperties
            };
            return React.createElement(ColorfulGrid, props);
        }

        if (this._employeeJobs != undefined && ((context.parameters.filterByIsuk.raw == "true" && this._userIsukGroups != undefined) || context.parameters.filterByIsuk.raw != "true") && !this._isLoading) {
            const props: IColorfulGridProps = {
                context: context,
                dataset: context.parameters.dataset,
                utils: context.utils,
                displayTextType: context.parameters.displayTextType?.raw ?? "SIMPLE",
                displayIconType: context.parameters.displayTextType?.raw !== "NOTEXT" ? context.parameters.displayIconType?.raw ?? "NAME" : "NAME",
                defaultIcon: context.parameters.defaultIcon?.raw ?? "CircleShapeSolid",
                iconConfig1: context.parameters.iconConfig1?.raw ?? undefined,
                iconConfig2: context.parameters.iconConfig2?.raw ?? undefined,
                iconConfig3: context.parameters.iconConfig3?.raw ?? undefined,
                containerWidth: (context.mode.allocatedWidth != -1) ? context.mode.allocatedWidth : (window.innerWidth - 109),
                containerHeight: context.mode.allocatedHeight,
                isSubgrid: (context.parameters as any).autoExpand != null,
                setFullScreen: context.mode.setFullScreen,
                isEditable: context.parameters.isEditable.raw === "Editable",
                employeeJobs: this._employeeJobs,
                userIsukGroups: this._userIsukGroups,
                subFilters: this.subFilters,
                cacheFilterKey: this._cacheFilterKey,
                updatedProperties: context.updatedProperties
            };
            return React.createElement(ColorfulGrid, props);
        }
        return React.createElement(LoadingGIF);
    }

    private isDashboardMode(context: ComponentFramework.Context<IInputs>): boolean {
        const mode = context.parameters.dashboardMode?.raw;
        return mode === "THERAPIST" || mode === "PROVIDER";
    }

    private parseIntOrDefault(value: string | null | undefined, fallback: number): number {
        const parsed = Number.parseInt(value ?? "", 10);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    private applyDashboardBaseFilter(context: ComponentFramework.Context<IInputs>): void {
        const mode = context.parameters.dashboardMode.raw;
        const therapistQueueName = (context.parameters.therapistQueueName.raw ?? "בקשות לטיפול מטפלים").trim();
        const providerQueueName = (context.parameters.providerQueueName.raw ?? "בקשות לטיפול ספקים").trim();
        const queueName = mode === "THERAPIST" ? therapistQueueName : providerQueueName;

        const queueItemAlias = (context.parameters.queueItemAlias.raw ?? "queueitem").trim();
        const queueAlias = (context.parameters.queueAlias.raw ?? "queue").trim();

        const requireActiveOnly = (context.parameters.requireActiveOnly.raw ?? "true") === "true";
        const incidentActiveState = this.parseIntOrDefault(context.parameters.incidentActiveStateCode.raw, 0);
        const waitingQueueItemState = this.parseIntOrDefault(context.parameters.waitingQueueItemStateCode.raw, 1);
        const waitingQueueItemStatus = this.parseIntOrDefault(context.parameters.waitingQueueItemStatusCode.raw, 2);

        const filterOperator: ComponentFramework.PropertyHelper.DataSetApi.Types.FilterOperator = 0;
        const filter: ComponentFramework.PropertyHelper.DataSetApi.FilterExpression = {
            conditions: [],
            filterOperator,
            filters: []
        };

        if (requireActiveOnly) {
            filter.conditions.push({ attributeName: "statecode", conditionOperator: 0, value: incidentActiveState.toString() });
        }

        filter.conditions.push({
            attributeName: "statecode",
            entityAliasName: queueItemAlias,
            conditionOperator: 0,
            value: waitingQueueItemState.toString()
        });

        filter.conditions.push({
            attributeName: "statuscode",
            entityAliasName: queueItemAlias,
            conditionOperator: 0,
            value: waitingQueueItemStatus.toString()
        });

        if (queueName) {
            filter.conditions.push({
                attributeName: "name",
                entityAliasName: queueAlias,
                conditionOperator: 0,
                value: queueName
            });
        }

        CacheHelper.saveJson<ComponentFramework.PropertyHelper.DataSetApi.FilterExpression>(this._cacheFilterKey, filter);
        context.parameters.dataset.filtering.setFilter(filter);
        context.parameters.dataset.paging.setPageSize(window.innerWidth <= 1366 ? 6 : 11);
        context.parameters.dataset.refresh();
        this._isLoading = false;
    }

    /** 
     * It is called by the framework prior to a control receiving new data. 
     * @returns an object based on nomenclature defined in manifest, expecting object[s] for property marked as “bound” or “output”
     */
    public getOutputs(): IOutputs {
        return {
        };
    }

    /** 
     * Called when the control is to be removed from the DOM tree. Controls should use this call for cleanup.
     * i.e. cancelling any pending remote calls, removing listeners, etc.
     */
    public destroy(): void {
    }

    private buildFilterCacheKey(context: ComponentFramework.Context<IInputs>) {
        return `ColorfulGrid_filter:${context.userSettings.userId}:` +
            `${context.parameters.filterByIsuk.raw || ""}:` +
            `${context.parameters.showSearchAndFilters.raw || ""}:` +
            `${context.parameters.builtInFilterText1.raw || ""}`;
    }
   
    private async applyCachedOrBuildFilter(
        context: ComponentFramework.Context<IInputs>,
        filter: ComponentFramework.PropertyHelper.DataSetApi.FilterExpression
    ) {
        // Ensure cached subFilters exist & are non-empty when filterByIsuk = true
        if (context.parameters.filterByIsuk.raw === "true") {
            this.subFilters = CacheHelper.tryLoadJson<ComponentFramework.PropertyHelper.DataSetApi.FilterExpression>(this._cacheSubFilterKey) ?? this.buildSubFilters(this._userIsukGroups);
        }

        const cachedFilter = CacheHelper.tryLoadJson<ComponentFramework.PropertyHelper.DataSetApi.FilterExpression>(this._cacheFilterKey);
        if (cachedFilter) {

            context.parameters.dataset.filtering.setFilter(cachedFilter);
            context.parameters.dataset.paging.setPageSize(window.innerWidth <= 1366 ? 6 : 11);
            context.parameters.dataset.refresh();
            this._isLoading = false;
            return;
        }

        if (context.parameters.filterByIsuk.raw == "true" && this.subFilters) {
            if (this._userIsukGroups && this._userIsukGroups.length > 0) {
                filter.filters?.push(this.subFilters);
            }
            else {
                const defaultCondition: ComponentFramework.PropertyHelper.DataSetApi.ConditionExpression = { attributeName: "el_s_home_visit_task_id", conditionOperator: 0, value: "-1" };
                filter.conditions.push(defaultCondition); // TODO check
            }
        }

        if (context.parameters.showSearchAndFilters.raw == "true" && context.parameters.builtInFilterText1.raw) {
            let statuses = sessionStorage.getItem(context.parameters.builtInFilterText1.raw + " Statuses");
            if (!statuses) {
                const fetch = "?fetchXml=<fetch>" +
                    "<entity name = 'environmentvariabledefinition'>" +
                    "<attribute name = 'defaultvalue'/>" +
                    "<attribute name = 'schemaname'/>" +
                    "<attribute name = 'displayname'/>" +
                    "<filter>" +
                    "<condition attribute='displayname' operator='eq' value='" + context.parameters.builtInFilterText1.raw + "'/>" +
                    "</filter>" +
                    "<link-entity name='environmentvariablevalue' from='environmentvariabledefinitionid' to='environmentvariabledefinitionid' link-type='outer' alias='evv'>" +
                    "<attribute name='value'/>" +
                    "</link-entity>" +
                    "</entity>" +
                    "</fetch>";

                const response = await context.webAPI.retrieveMultipleRecords("environmentvariabledefinition", fetch);
                if (response?.entities?.length > 0) {
                    statuses = response.entities[0]["evv.value"] || response.entities[0].defaultvalue;
                    if (statuses != null)
                        sessionStorage.setItem(context.parameters.builtInFilterText1.raw + " Statuses", statuses);
                }
            }

            if (statuses) {
                const statusCond: ComponentFramework.PropertyHelper.DataSetApi.ConditionExpression = {
                    attributeName: "statuscode",
                    conditionOperator: 8,
                    value: statuses.split(";").filter(Boolean)
                };
                filter.conditions.push(statusCond);
            }
        }

        CacheHelper.saveJson<ComponentFramework.PropertyHelper.DataSetApi.FilterExpression>(this._cacheFilterKey, filter);
        context.parameters.dataset.filtering.setFilter(filter);
        context.parameters.dataset.paging.setPageSize(window.innerWidth <= 1366 ? 6 : 11);
        context.parameters.dataset.refresh();
        this._isLoading = false;
    }

    private buildSubFilters(isukGroups: IsukGroup[] | undefined)
        : ComponentFramework.PropertyHelper.DataSetApi.FilterExpression {

        const OR: ComponentFramework.PropertyHelper.DataSetApi.Types.FilterOperator = 1;
        const subFilters: ComponentFramework.PropertyHelper.DataSetApi.FilterExpression = { conditions: [], filterOperator: OR, filters: [] };

        if (isukGroups && isukGroups.length > 0) {
            isukGroups.forEach(group => {
                const subFilter: ComponentFramework.PropertyHelper.DataSetApi.FilterExpression = {
                    conditions: group.approvalLevel == 2
                        ? [
                            { attributeName: "el_id_region", conditionOperator: 0, value: group.region },
                            { attributeName: "el_id_isuk_group", conditionOperator: 8, value: group.isukGroups }
                        ]
                        : [
                            { attributeName: "el_id_district", conditionOperator: 0, value: group.district },
                            { attributeName: "el_id_isuk_group", conditionOperator: 8, value: group.isukGroups }
                        ],
                    filterOperator: 0
                };
                subFilters.filters?.push(subFilter);
            });
        }

        CacheHelper.saveJson<ComponentFramework.PropertyHelper.DataSetApi.FilterExpression>(this._cacheSubFilterKey, subFilters);
        return subFilters;
    }
}