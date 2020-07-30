import { JSDOM, DOMWindow } from "jsdom";
import { read, findFormats } from "file";
import { Entity } from "types/Entity";
import { HTMLDocumentProcessor } from "services/html-processor/HTMLDocumentProcessor";
import { selectResourcesNotProcessed } from "data";
import { fancyLog, tabulate } from "common/util";
import { SAFELY_EXIT } from "common/processor";
import { ResourceVersionType } from "types/objects/ResourceVersionType";
import { PromisePool } from "common/PromisePool";
import { HitType } from "types/HitType";

const ANCHOR_TAG = "a";

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

export function htmlCollectionToArray<T extends Element>(
    coll: HTMLCollectionOf<T> | NodeListOf<T>
) {
    const array = new Array<T>(coll.length);
    for (let position = 0; position < coll.length; ++position)
        array[position] = coll.item(position);

    return array;
}

export function getAnchorsWithHREF(window: DOMWindow) {
    const truthyAndFalseyAnchors =
        htmlCollectionToArray(window.document.getElementsByTagName(ANCHOR_TAG));

    return truthyAndFalseyAnchors.filter(a => a.href);
}

export function contentFromNode(node: Element, hitType: HitType) {
    let content: string;
    switch (hitType) {
        case HitType.META_DATA:
            content = node.getAttribute("content");
            break;
        case HitType.ACCESSABILITY_DATA:
            content = node.getAttribute("title");
            if (!content) node.getAttribute("alt");
            break;
        default:
            content = node.textContent;
    }

    return content;
}
export function wordsFromNode(node: Element, hitType: HitType) {
    const content = contentFromNode(node, hitType);
    const lc = content.toLowerCase();
    const normalised = lc.replace(/[–-]/g, "");
    const words = normalised.match(/[^ \t\s!"'^&*();:@~#\n®.,<>?/\[\]\\{}“”‘’]+/g);
    return words;
}

//let a: number;
export async function processURL(
    resource: bigint,
    url: string,
    time: number,
    pool: PromisePool,
    processors: HTMLDocumentProcessor[]
) {
    let formats: ResourceVersionType[];
    try {
        //a = Date.now();
        formats = await findFormats(Entity.RESOURCE, resource, time);
        //updateMean("findFormats", a);
    } catch (e) {
        fancyLog("error while listing formats");
        fancyLog(JSON.stringify(e));
        SAFELY_EXIT[0] = true;
    }
    for (const format of formats) {
        if (format.filename === ResourceVersionType.RAW_HTML.filename) {
            let content: Buffer;
            try {
                content = await read(Entity.RESOURCE, resource, time, ResourceVersionType.RAW_HTML);
            } catch (e) {
                fancyLog("error while reading file");
                fancyLog(JSON.stringify(e));
                SAFELY_EXIT[0] = true;
            }
            if (content) {
                console.log(`${time} ${url}`);
                let window: DOMWindow;
                let reDOM = true;
                for (const processor of processors) {
                    if (reDOM) {
                        window = new JSDOM(content, { url }).window;
                    }
                    await pool.registerPromise(processor.apply(window, time));
                    reDOM = !processor.ro();
                }
            }
        }
    }
}

export const buildProcessFunction = (processors: HTMLDocumentProcessor[]) =>
    async function process(lo: () => bigint, hi: () => bigint) {
        const pool = new PromisePool(50);
        const rows = await selectResourcesNotProcessed();
        for (const row of rows) {
            const id = row.resource;
            if (id >= lo() && id < hi())
                await processURL(id, row.url, row.time, pool, processors);
        }
        pool.flush();
    }
