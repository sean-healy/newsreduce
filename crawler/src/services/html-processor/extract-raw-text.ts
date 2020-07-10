import { HTMLDocumentProcessor } from "services/html-processor/HTMLDocumentProcessor"
import { write } from "file";
import { FileFormat } from "types/FileFormat";
import { Entity } from "types/Entity";
import { ResourceURL } from "types/objects/ResourceURL";
import { DOMWindow } from "jsdom";
import { removeExcludedNodes } from "./functions";

export function toRawText(window: DOMWindow) {
    removeExcludedNodes(window);
    const rawText = window.document.body.textContent
        .replace(/\n\s+\n/g, "\n\n")
        .replace(/\n\n+/g, "\n\n");

    return rawText;
}

export const process: HTMLDocumentProcessor = (window, version) => {
    const promises: Promise<unknown>[] = [];
    const rawText = toRawText(window);
    const resource = new ResourceURL(window.location.toString());
    promises.push(write(Entity.RESOURCE, resource.getID(), version, FileFormat.RAW_TXT, rawText));

    return Promise.all(promises) as any;
}
