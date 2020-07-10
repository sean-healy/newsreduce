import { JSDOM, DOMWindow } from "jsdom";
import { readLatestVersion } from "file";
import { renewRedis, REDIS_PARAMS } from "common/connections";
import { FileFormat } from "types/FileFormat";
import { Entity } from "types/Entity";
import { process as process0 } from "services/html-processor/extract-ahrefs";
import { process as process1 } from "services/html-processor/extract-hits";
import { process as process2 } from "services/html-processor/extract-raw-text";
import { process as process3 } from "services/html-processor/extract-wiki-tree";
import { ResourceURL } from "types/objects/ResourceURL";
const PROCESSORS = [process0, process1, process2, process3];

export async function process() {
    let url: string;
    while (true) {
        url = await new Promise<string>((res, rej) => {
            renewRedis(REDIS_PARAMS.processQueues).spop("html", async (err, url) => {
                if (err) rej(err);
                else res(url);
            });
        });
        if (!url) break;
        const resourceURL = new ResourceURL(url);
        const promises: Promise<any>[] = [];
        const content =
            await readLatestVersion(Entity.RESOURCE, resourceURL.getID(), FileFormat.RAW_HTML)
        for (const process of PROCESSORS)
            promises.push(process(new JSDOM(content, { url }).window, 1));
        await Promise.all(promises);
    }
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
