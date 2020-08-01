import { ResourceURL } from "types/objects/ResourceURL";
import { JSDOM } from "jsdom";
import { VersionType } from "types/objects/VersionType";
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
        await resource.writeVersion(time, VersionType.RAW_WORDS_TXT, rawText);
    }
    from() {
        return new Set([VersionType.RAW_HTML_FILE]);
    }
    to() {
        return new Set([VersionType.RAW_WORDS_TXT_FILE]);
    }
}
