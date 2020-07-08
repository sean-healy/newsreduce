import { HTMLDocumentProcessor } from "./HTMLDocumentProcessor"
import { write } from "../file";
import { FileFormat } from "../types/FileFormat";
import { Entity } from "../types/Entity";

const EXCLUDE = [
    "NOSCRIPT",
    "SCRIPT",
    "STYLE",
    "FORM",
    "INPUT",
    "BUTTON",
];

export const process: HTMLDocumentProcessor = (doc, resource, version) => {
    const promises: Promise<unknown>[] = [];
    for (const tag of EXCLUDE) {
        const items = doc.querySelectorAll(tag);
        for (let i = 0; i < items.length; ++i) {
            const item = items.item(i);
            item.parentElement.removeChild(item);
        }
    }
    const rawText = doc.body.textContent.replace(/\n\s+\n/g, "\n\n").replace(/\n\n+/g, "\n\n");
    promises.push(write(Entity.RESOURCE, resource.getID(), version, FileFormat.RAW_TXT, rawText));

    return promises;
}
