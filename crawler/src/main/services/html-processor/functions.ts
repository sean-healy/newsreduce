import { JSDOM, DOMWindow } from "jsdom";
import { read, findFormats } from "file";
import { Entity } from "types/Entity";
import { ExtractHits } from "./ExtractHits";
import { ExtractAHrefs } from "services/html-processor/ExtractAHrefs";
import { ExtractRawText } from "services/html-processor/ExtractRawText";
import { ExtractWikiTree } from "services/html-processor/ExtractWikiTree";
import { HTMLDocumentProcessor } from "services/html-processor/HTMLDocumentProcessor";
import { selectResourcesNotProcessed } from "data";
import { fancyLog, tabulate } from "common/util";
import { SAFELY_EXIT } from "common/processor";
import { ResourceVersionType } from "types/objects/ResourceVersionType";
import { ExtractTitle } from "./ExtractTitle";
import { PromisePool } from "common/PromisePool";
const PROCESSORS: HTMLDocumentProcessor[] =
    [new ExtractAHrefs(), new ExtractTitle(), new ExtractWikiTree(), new ExtractRawText(), new ExtractHits()];

const means: { [key: string]: [number, number] } = {};

function printMeans() {
    const tmpMeans: { [key: string]: any }[] = [];
    for (const task in means) {
        const [count, mean] = means[task];
        tmpMeans.push({
            task,
            count,
            mean,
        });
    }
    tabulate(tmpMeans);
}

function updateMean(task: string, a: number) {
    const b = Date.now();
    const time = b - a;
    if (task in means) {
        const [count, mean] = means[task];
        means[task] = [count + 1, (count * mean + time) / (count + 1)];
    } else
        means[task] = [1, time];
    printMeans();
}

let a: number;
export async function processURL(resource: bigint, url: string, time: number, pool: PromisePool) {
    let formats: ResourceVersionType[];
    try {
        a = Date.now();
        formats = await findFormats(Entity.RESOURCE, resource, time);
        updateMean("findFormats", a);
    } catch (e) {
        fancyLog("error while listing formats");
        fancyLog(JSON.stringify(e));
        SAFELY_EXIT[0] = true;
    }
    for (const format of formats) {
        if (format.filename === ResourceVersionType.RAW_HTML.filename) {
            let content: Buffer;
            try {
                a = Date.now();
                content = await read(Entity.RESOURCE, resource, time, ResourceVersionType.RAW_HTML);
                updateMean("read", a);
            } catch (e) {
                fancyLog("error while reading file");
                fancyLog(JSON.stringify(e));
                SAFELY_EXIT[0] = true;
            }
            if (content) {
                //console.log(`${time} ${url}`);
                let window: DOMWindow;
                let reDOM = true;
                for (const processor of PROCESSORS) {
                    if (reDOM) {
                        a = Date.now();
                        window = new JSDOM(content, { url }).window;
                        updateMean("redom", a);
                    }
                    //const name = (processor as any).__proto__.constructor.name;
                    a = Date.now();
                    await pool.registerPromise(processor.apply(window, time));
                    updateMean("promises", a);
                    reDOM = !processor.ro();
                }
            }
        }
    }
}

export async function process() {
    const pool = new PromisePool(50);
    const rows = await selectResourcesNotProcessed();
    for (const row of rows)
        await processURL(row.resource, row.url, row.time, pool);
    pool.flush();
}
