import { JSDOM } from "jsdom";
import { ResourceProcessor } from "services/resource-processor/ResourceProcessor";
import { Dictionary, fancyLog } from "utils/alpha";
import { VersionType } from "types/db-objects/VersionType";
import { PromisePool } from "common/PromisePool";
import { HitType } from "types/HitType";
import { ResourceURL } from "types/db-objects/ResourceURL";
import { DOMPool } from "./DOMPool";
import { Tokenizer } from "ml/Tokenizer";
import { GLOBAL_VARS } from "common/processor";
import { ExtractHits } from "services/resource-processor/ExtractHits";
import { ExtractAHrefs } from "services/resource-processor/ExtractAHrefs";
import { ExtractRawText } from "services/resource-processor/ExtractRawText";
import { ExtractWikiTree } from "services/resource-processor/ExtractWikiTree";
import { ExtractTitle } from "services/resource-processor/ExtractTitle";
import { ExtractTokens } from "./ExtractTokens";
import { ExtractReducedTokens } from "./ExtractReducedTokens";
import { ExtractBOW } from "./ExtractBOW";
import { ExtractBOSG } from "./ExtractBOSG";
import { ExtractDocumentVector } from "./ExtractDocumentVector";
import { ExtractBOBG } from "./ExtractBOBG";
import { ExtractBOTG } from "./ExtractBOTG";
import { ExtractBOL } from "./ExtractBOL";
import { ExtractSubDocuments } from "./ExtractSubDocuments";
import { ExtractNormalisedDocumentVector } from "./ExtractNormalisedDocumentVector";

export const ANCHOR_TAG = "a";

export const EXTRACTORS = [
    ExtractDocumentVector,
    ExtractNormalisedDocumentVector,
    ExtractAHrefs,
    ExtractSubDocuments,
    ExtractTitle,
    ExtractWikiTree,
    ExtractRawText,
    ExtractReducedTokens,
    ExtractHits,
    ExtractBOW,
    ExtractBOSG,
    ExtractBOBG,
    ExtractBOTG,
    ExtractBOW.Reduced(),
    ExtractBOSG.Reduced(),
    ExtractBOBG.Reduced(),
    ExtractBOTG.Reduced(),
    ExtractBOL,
    ExtractTokens,
];


export function htmlCollectionToArray<T extends Element>(
    coll: HTMLCollectionOf<T> | NodeListOf<T>
) {
    const array = new Array<T>(coll.length);
    for (let position = 0; position < coll.length; ++position)
        array[position] = coll.item(position);

    return array;
}

export function getAnchorsWithHREF(dom: JSDOM) {
    const truthyAndFalseyAnchors =
        htmlCollectionToArray(dom.window.document.getElementsByTagName(ANCHOR_TAG));

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
    if (!content) return [];
    const words = Tokenizer.tokenizeDocument(content);

    return words;
}

function filenameToBufferOrPath(resource: ResourceURL, time: number, filename: string): Promise<Buffer | ResourceURL> {
    switch (filename) {
        case VersionType.RAW_ZIP.filename:
            return new Promise<ResourceURL>(res => res(resource));
        default: return resource.read(time, new VersionType(filename))
    }

}
export interface InputCache {
    buffer?: Buffer;
    string?: string;
    tokens?: string[][];
}
export async function processResource(
    resource: ResourceURL,
    time: number,
    pool: PromisePool,
    processors: ResourceProcessor[]
) {
    const url = resource.toURL();
    let buffersOrPaths: (ResourceURL | Buffer)[];
    const filenames: string[] = [];
    for (const processor of processors)
        for (const type of processor.from())
            filenames.push(type.filename);
    try {
        buffersOrPaths =
            await Promise.all(filenames.map(filename => filenameToBufferOrPath(resource, time, filename)));
    } catch (e) {
        fancyLog(e.toString());
    }
    const dictionary: Dictionary<Buffer | ResourceURL> = {};
    let i = 0;
    for (const bufferOrPath of buffersOrPaths)
        if (bufferOrPath)
            dictionary[filenames[i++]] = bufferOrPath;
    const domPool = new DOMPool();
    let reDOM = true;
    nextProcessor: for (const processor of processors) {
        let bufferInput: Dictionary<InputCache> = {}
        for (const filename of processor.from().map(t => t.filename)) {
            if (!(filename in dictionary))
                continue nextProcessor;
            bufferInput[filename] = {
                buffer: dictionary[filename] as Buffer,
            }
        }
        console.log(`${time} ${(processor as any).__proto__.constructor.name} ${url} `);
        await pool.registerPromise(processor.apply(resource, bufferInput, time, domPool, reDOM));
        reDOM = !processor.ro();
        if (GLOBAL_VARS.safelyExit) break;
    }
}

export function buildProcessFunction(processors: ResourceProcessor[]) {
    return async function processResources(lo: () => bigint, hi: () => bigint) {
        const todoByID: Dictionary<Map<number, ResourceProcessor[]>> = {};
        fancyLog(`Loading queues...`);
        console.log(processors);
        const queues = await Promise.all(processors.map(p => p.loadQueue(lo(), hi())));
        fancyLog(`Loaded queues...`);
        for (let i = 0; i < processors.length; ++i) {
            const processor = processors[i];
            const queue = queues[i];
            for (const { resource, time } of queue) {
                const url = resource.toURL();
                let timeMap = todoByID[url];
                if (!timeMap) {
                    timeMap = new Map();
                    todoByID[url] =  timeMap;
                }
                let processors = timeMap.get(time);
                if (!processors) {
                    processors = [];
                    timeMap.set(time, processors);
                }
                processors.push(processor);
            }
        }
        console.log();
        const pool = new PromisePool(1);
        outer: for (const url in todoByID) {
            const resource = new ResourceURL(url);
            const id = resource.getID();
            if (id < lo() || id >= hi()) continue;
            const versions = todoByID[url];
            for (const [time, processors] of versions) {
                await processResource(resource, time, pool, processors);
                if (GLOBAL_VARS.safelyExit) break outer;
            }
        }
        await pool.flush();
    }
}