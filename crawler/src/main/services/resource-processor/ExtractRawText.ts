import { ResourceURL } from "types/objects/ResourceURL";
import { JSDOM } from "jsdom";
import { ResourceVersionType } from "types/objects/ResourceVersionType";
import { HTMLProcessor } from "./HTMLProcessor";

export function toRawText(dom: JSDOM) {
    HTMLProcessor.removeExcludedNodes(dom);
    const rawText = dom.window.document.body.textContent
        .replace(/\n\s+\n/g, "\n\n")
        .replace(/\n\n+/g, "\n\n");

    return rawText;
}

export class ExtractRawText extends HTMLProcessor {
    ro() { return true; }
    async applyToDOM(dom: JSDOM, time?: number) {
        const rawText = toRawText(dom);
        const resource = new ResourceURL(dom.window.location.toString());
        await resource.writeVersion(time, ResourceVersionType.RAW_WORDS_TXT, rawText);
    }
    from() {
        return new Set([ResourceVersionType.RAW_HTML_FILE]);
    }
    to() {
        return new Set([ResourceVersionType.RAW_WORDS_TXT_FILE]);
    }
}
