import { JSDOM } from "jsdom";
import { Dictionary } from "common/util";
import { DOMPool } from "./DOMPool";
import { ResourceURL } from "types/db-objects/ResourceURL";
import { ResourceProcessor } from "./ResourceProcessor";
import { VersionType } from "types/db-objects/VersionType";
import { InputCache } from "./functions";

export const EXCLUDE = new Set([
    "NOSCRIPT",
    "SCRIPT",
    "STYLE",
    "SVG",
]);

export abstract class HTMLProcessor extends ResourceProcessor {
    apply(resource: ResourceURL, input: Dictionary<InputCache>, time?: number, domPool?: DOMPool, reDOM?: boolean): Promise<void> {
        const buffer = input[VersionType.RAW_HTML.filename].buffer;
        let dom: JSDOM;
        if (reDOM) dom = domPool.replace(resource, time, buffer);
        else dom = domPool.renew(resource, time, buffer);

        return this.applyToDOM(resource, dom, time);
    }
    abstract applyToDOM(resource: ResourceURL, dom: JSDOM, time?: number): Promise<void>;
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

