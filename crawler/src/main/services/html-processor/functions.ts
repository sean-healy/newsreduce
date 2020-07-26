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
import { SAFELY_EXIT } from "common/processor";
import { ResourceVersionType } from "types/objects/ResourceVersionType";
const PROCESSORS: HTMLDocumentProcessor[] =
    [new ExtractAHrefs(), new ExtractWikiTree(), new ExtractRawText(), new ExtractHits()];

export async function processURL(resource: bigint, url: string, time: number) {
    let formats: ResourceVersionType[];
    try {
        formats = await findFormats(Entity.RESOURCE, resource, time);
    } catch (e) {
        fancyLog("error while listing formats");
        fancyLog(JSON.stringify(e));
        SAFELY_EXIT[0] = true;
    }
    for (const format of formats) {
        if (format.filename === ResourceVersionType.RAW_HTML.filename) {
            let content: Buffer;
            try {
                content =
                    await read(Entity.RESOURCE, resource, time, ResourceVersionType.RAW_HTML);
            } catch (e) {
                fancyLog("error while reading file");
                fancyLog(JSON.stringify(e));
                SAFELY_EXIT[0] = true;
            }
            if (content) {
                console.log(`${time} ${url}`);
                let window: DOMWindow;
                let reDOM = true;
                const promises: Promise<any>[] = [];
                for (const processor of PROCESSORS) {
                    if (reDOM) window = new JSDOM(content, { url }).window;
                    promises.push(processor.apply(window, time));
                    reDOM = processor.ro();
                }
                await Promise.all(promises);
            }
        }
    }
}

export async function process() {
    for (const row of await selectResourcesNotProcessed())
        await processURL(row.resource, row.url, row.time);
}
