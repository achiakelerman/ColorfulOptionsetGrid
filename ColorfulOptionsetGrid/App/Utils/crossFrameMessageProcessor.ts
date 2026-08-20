//import { Utils } from "./utils";

export class CrossFrameMessages {
    static readonly CloseModalForm = 'DefaultCloseModalFormMessage';
    static readonly GenerateCleaningsCompleted = 'GenerateCleaningsCompleted';
    static readonly ChangeContactsView = 'ChangeContactsView';
}

export default class CrossFrameMessageProcessor {
    private _name: string;
    private _data: any;
    private _handler?: IHandler;

    constructor(name: string, data: any, handler?: IHandler) {
        this._name = name;
        this._data = data;
        this._handler = typeof handler !== 'function' ? undefined : handler;
    }

    static AddMessageListener(is_top: boolean): void {
        const target = (is_top ? window.top : window) ?? window;
        const func = is_top ? CrossFrameMessageProcessor.GetMessage_OnTop : CrossFrameMessageProcessor.GetMessage;

        if (!target.listener_added) {
            if (target.addEventListener) {
                target.addEventListener("message", func, false);
            }
            else {
                target.attachEvent("onmessage", func);
            }
            target.listener_added = true;
            target.listener_handlers = {};
        }
    }

    static ClearMessageListeners(is_top: boolean): void {
        const target = (is_top ? window.top : window) ?? window;
        const func = is_top ? CrossFrameMessageProcessor.GetMessage_OnTop : CrossFrameMessageProcessor.GetMessage;

        if (target.listener_added) {
            if (target.removeEventListener) {
                target.removeEventListener("message", func, false);
            }
            else {
                target.detachEvent("onmessage", func);
            }
            target.listener_added = false;
            target.listener_handlers = null;
        }
    }

    static AddMessageHandler(name: string, handler: any, is_top: boolean): void {
        const target = (is_top ? window.top : window) ?? window;
        target.listener_handlers[name] = handler;
    }

    static RemoveMessageHandler(name: string, is_top: boolean): void {
        const target = is_top ? window.top : window;
        delete target?.listener_handlers[name];
    }

    static SendMessage(name: string, data: any, target: Window): void {
        const message = new CrossFrameMessageProcessor(name, data, () => alert("This message has no handler"));

        if (target === null)
            target = window.top ?? window;
        target.postMessage(JSON.stringify(message), "*");
    }

    private static GetMessage_OnTop(event: Event): void {
        let message;

        try {
            message = JSON.parse(event.data);
        } catch (e) {
            message = event.data;
        } 

        if (typeof message._name !== 'undefined') {
            window.top?.listener_handlers[message._name].call(null, message._data);
        }
    }

    private static GetMessage(event: Event): void {
        let message;

		try {
            message = JSON.parse(event.data);
        } catch (e) {
            message = event.data;
		} 

        if (typeof message._name !== 'undefined') {
            window?.listener_handlers[message._name].call(null, message._data);
        }
    }
}

interface IHandler {
    (): void;
}