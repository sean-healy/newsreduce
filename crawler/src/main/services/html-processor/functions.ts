import { JSDOM, DOMWindow } from "jsdom";
import { read, findFormats } from "file";
import { FileFormat } from "types/FileFormat";
import { Entity } from "types/Entity";
import { process as process0 } from "services/html-processor/extract-ahrefs";
import { process as process1 } from "services/html-processor/extract-hits";
import { process as process2 } from "services/html-processor/extract-raw-text";
import { process as process3 } from "services/html-processor/extract-wiki-tree";
import { selectResourcesNotProcessed } from "data";
import { fancyLog } from "common/util";
const PROCESSORS = [process0, process1, process2, process3];

export async function processURL(resource: bigint, url: string, time: number) {
    fancyLog(url);
    const promises: Promise<any>[] = [];
    const formats = await findFormats(Entity.RESOURCE, resource, time);
    for (const format of formats) {
        if (format === FileFormat.RAW_HTML) {
            const content = await read(Entity.RESOURCE, resource, time, FileFormat.RAW_HTML);
            if (content) for (const process of PROCESSORS)
                promises.push(process(new JSDOM(content, { url }).window, time));
        }
    }
    await Promise.all(promises);
}

export async function process() {
    for (const row of await selectResourcesNotProcessed())
        await processURL(row.resource, row.url, row.time);
}

const EXCLUDE = [
    "NOSCRIPT",
    "SCRIPT",
    "STYLE",
    "FORM",
    "INPUT",
    "BUTTON",
];
export function removeExcludedNodes(window: DOMWindow) {
    for (const tag of EXCLUDE) {
        const items = window.document.querySelectorAll(tag);
        for (let i = 0; i < items.length; ++i) {
            const item = items.item(i);
            item.parentElement.removeChild(item);
        }
    }
}
