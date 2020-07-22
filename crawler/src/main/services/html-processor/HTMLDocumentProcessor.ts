import { DOMWindow } from "jsdom";

const EXCLUDE = [
    "NOSCRIPT",
    "SCRIPT",
    "STYLE",
    "FORM",
    "INPUT",
    "BUTTON",
];

export abstract class HTMLDocumentProcessor {
    constructor() { }
    abstract ro(): boolean;
    abstract apply(window: DOMWindow, time?: number): Promise<void>;
    static removeExcludedNodes(window: DOMWindow) {
        for (const tag of EXCLUDE) {
            const items = window.document.querySelectorAll(tag);
            for (let i = 0; i < items.length; ++i) {
                const item = items.item(i);
                item.parentElement.removeChild(item);
            }
        }
    }
}

