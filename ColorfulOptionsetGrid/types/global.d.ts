
import * as _React from 'react';
import * as _ReactDOM from 'react-dom';

declare global {
    const React: typeof _React;
    const ReactDOM: typeof _ReactDOM;
    interface Window {
        msCrypto: Crypto;
        listener_added: boolean;
        listener_handlers: any;
        attachEvent(event: string, listener: EventListener): boolean;
        detachEvent(event: string, listener: EventListener): void;
        //XrmGridContacts: Xrm.Controls.GridControl;
        //XrmFormContext: Xrm.FormContext;
        //XrmGlobalContext: Xrm.GlobalContext;
        OpportunityStepName: string;
    }
    interface Event {
        data: any;
    }
    //interface Element {
    //    style: ICustomStyle;
    //}
    //interface ICustomStyle {
    //    display: string;
    //    "background-color": string;
    //}

}