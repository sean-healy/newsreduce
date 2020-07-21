import { JSDOM, DOMWindow } from "jsdom";
import { findLatestVersion, read } from "file";
import { FileFormat } from "types/FileFormat";
import { Entity } from "types/Entity";
import { process as process0 } from "services/html-processor/extract-ahrefs";
import { process as process1 } from "services/html-processor/extract-hits";
import { process as process2 } from "services/html-processor/extract-raw-text";
import { process as process3 } from "services/html-processor/extract-wiki-tree";
import { ResourceURL } from "types/objects/ResourceURL";
import { selectFetchedURLs } from "data";
import { fancyLog } from "common/util";
const PROCESSORS = [process0, process1, process2, process3];

export async function processURL(url: string) {
    fancyLog(url);
    const resourceURL = new ResourceURL(url);
    const promises: Promise<any>[] = [];
    const version = await findLatestVersion(Entity.RESOURCE, resourceURL.getID(), FileFormat.RAW_HTML);
    if (version !== -1) {
        const content = await read(Entity.RESOURCE, resourceURL.getID(), version, FileFormat.RAW_HTML)
        if (content && false)
            for (const process of PROCESSORS)
                promises.push(process(new JSDOM(content, { url }).window, version));
    }
    await Promise.all(promises);
}

let LAST_CALLED = 0;

export async function process() {
    const called = Date.now();
    for (let url = await ResourceURL.popForProcessing(); url; url = await ResourceURL.popForProcessing())
        await processURL(url.toURL());
    for (const url of await selectFetchedURLs(LAST_CALLED))
        await processURL(url);
    LAST_CALLED = called;
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
