import * as React from "react";
import * as ReactDOM from "react-dom";
import { IInputs, IOutputs } from "./generated/ManifestTypes";
import { DashboardConfig, TreatmentRequestsDashboard } from "./App/TreatmentRequestsDashboard";

export class ColorfulOptionsetGrid implements ComponentFramework.StandardControl<IInputs, IOutputs> {
    private container: HTMLDivElement;

    public init(
        context: ComponentFramework.Context<IInputs>,
        notifyOutputChanged: () => void,
        state: ComponentFramework.Dictionary,
        container: HTMLDivElement
    ): void {
        this.container = container;
        context.mode.trackContainerResize(true);
    }

    public updateView(context: ComponentFramework.Context<IInputs>): void {
        const config: DashboardConfig = {
            mode: context.parameters.dashboardMode.raw === "PROVIDER" ? "PROVIDER" : "THERAPIST",
            therapistQueueName: (context.parameters.therapistQueueName.raw ?? "בקשות לטיפול מטפלים").trim(),
            providerQueueName: (context.parameters.providerQueueName.raw ?? "בקשות לטיפול ספקים").trim(),
            waitingQueueItemStateCode: (context.parameters.waitingQueueItemStateCode.raw ?? "1").trim(),
            waitingQueueItemStatusCode: (context.parameters.waitingQueueItemStatusCode.raw ?? "2").trim(),
            genderAttribute: (context.parameters.genderAttribute.raw ?? "mac_p_member_gender").trim(),
            languageAttribute: (context.parameters.languageAttribute.raw ?? "mac_p_preferred_language").trim(),
            dayAttribute: (context.parameters.dayAttribute.raw ?? "mac_p_preffered_day").trim(),
            timeAttribute: (context.parameters.timeAttribute.raw ?? "mac_p_preferred_time").trim(),
            queueTypeAttribute: (context.parameters.queueTypeAttribute.raw ?? "mac_p_preferred_queue_type").trim(),
            cityEntityName: (context.parameters.cityEntityName.raw ?? "ey_city").trim(),
            cityIdAttribute: (context.parameters.cityIdAttribute.raw ?? "ey_cityid").trim(),
            cityNameAttribute: (context.parameters.cityNameAttribute.raw ?? "ey_name").trim(),
            incidentCityLinkEntity: (context.parameters.incidentCityLinkEntity.raw ?? "mac_incident_ey_city").trim(),
            incidentCityAttribute: (context.parameters.incidentCityAttribute.raw ?? "mac_incidentid").trim(),
            cityLinkLookupAttribute: (context.parameters.cityLinkLookupAttribute.raw ?? "mac_cityid").trim()
        };

        ReactDOM.render(
            React.createElement(TreatmentRequestsDashboard, { context, config }),
            this.container
        );
    }

    public getOutputs(): IOutputs {
        return {};
    }

    public destroy(): void {
        ReactDOM.unmountComponentAtNode(this.container);
    }
}
