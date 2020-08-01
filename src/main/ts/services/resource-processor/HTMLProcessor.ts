import { JSDOM } from "jsdom";
import { Dictionary } from "common/util";
import { DOMPool } from "./DOMPool";
import { ResourceURL } from "types/objects/ResourceURL";
import { ResourceProcessor } from "./ResourceProcessor";
import { VersionType } from "types/objects/VersionType";

const EXCLUDE = [
    "NOSCRIPT",
    "SCRIPT",
    "STYLE",
    "FORM",
    "INPUT",
    "BUTTON",
];

export abstract class HTMLProcessor extends ResourceProcessor {
    apply(resource: ResourceURL, input: Dictionary<Buffer>, time?: number, domPool?: DOMPool, reDOM?: boolean): Promise<void> {
        const buffer = input[VersionType.RAW_HTML_FILE];
        let dom: JSDOM;
        if (reDOM) dom = domPool.replace(resource, time, buffer);
        else dom = domPool.renew(resource, time, buffer);

        return this.applyToDOM(dom, time);
    }
    abstract applyToDOM(dom: JSDOM, time?: number): Promise<void>;
    static removeExcludedNodes(dom: JSDOM) {
        for (const tag of EXCLUDE) {
            const items = dom.window.document.querySelectorAll(tag);
            for (let i = 0; i < items.length; ++i) {
                const item = items.item(i);
                item.parentElement.removeChild(item);
            }
        }
    }
}

