import { HTMLDocumentProcessor } from "services/html-processor/HTMLDocumentProcessor"
import { FileFormat } from "types/FileFormat";
import { ResourceURL } from "types/objects/ResourceURL";
import { DOMWindow } from "jsdom";
import { ResourceVersion } from "types/objects/ResourceVersion";
import { ResourceVersionType } from "types/objects/ResourceVersionType";

export function toRawText(window: DOMWindow) {
    HTMLDocumentProcessor.removeExcludedNodes(window);
    const rawText = window.document.body.textContent
        .replace(/\n\s+\n/g, "\n\n")
        .replace(/\n\n+/g, "\n\n");

    return rawText;
}

export class ExtractRawText extends HTMLDocumentProcessor {
    ro() { return true; }
    async apply(window: DOMWindow, time?: number) {
        const rawText = toRawText(window);
        const resource = new ResourceURL(window.location.toString());
        const length = await resource.writeVersion(time, FileFormat.RAW_TXT, rawText);
        await new ResourceVersion({ resource, time, type: ResourceVersionType.RAW_TXT, length })
            .enqueueInsert({ recursive: true });
    }
}
