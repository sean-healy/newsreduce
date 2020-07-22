import { JSDOM, DOMWindow } from "jsdom";
import { read, findFormats } from "file";
import { FileFormat } from "types/FileFormat";
import { Entity } from "types/Entity";
import { ExtractHits } from "./ExtractHits";
import { ExtractAHrefs } from "services/html-processor/ExtractAHrefs";
import { ExtractRawText } from "services/html-processor/ExtractRawText";
import { ExtractWikiTree } from "services/html-processor/ExtractWikiTree";
import { HTMLDocumentProcessor } from "services/html-processor/HTMLDocumentProcessor";
import { selectResourcesNotProcessed } from "data";
import { fancyLog } from "common/util";
const PROCESSORS: HTMLDocumentProcessor[] =
    [new ExtractAHrefs(), new ExtractWikiTree(), new ExtractRawText(), new ExtractHits()];

export async function processURL(resource: bigint, url: string, time: number) {
    fancyLog(url);
    const promises: Promise<any>[] = [];
    const formats = await findFormats(Entity.RESOURCE, resource, time);
    for (const format of formats) {
        if (format === FileFormat.RAW_HTML) {
            const content = await read(Entity.RESOURCE, resource, time, FileFormat.RAW_HTML);
            if (content) {
                let window: DOMWindow;
                let reDOM = true;
                for (const processor of PROCESSORS) {
                    if (reDOM) window = new JSDOM(content, { url }).window;
                    promises.push(processor.apply(window, time));
                    reDOM = processor.ro();
                }
            }
        }
    }
    await Promise.all(promises);
}

export async function process() {
    for (const row of await selectResourcesNotProcessed())
        await processURL(row.resource, row.url, row.time);
}
