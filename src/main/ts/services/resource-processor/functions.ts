import { JSDOM } from "jsdom";
import { ResourceProcessor } from "services/resource-processor/ResourceProcessor";
import { selectResourceVersions } from "data";
import { Dictionary, fancyLog } from "common/util";
import { VersionType } from "types/db-objects/VersionType";
import { PromisePool } from "common/PromisePool";
import { HitType } from "types/HitType";
import { ResourceURL } from "types/db-objects/ResourceURL";
import { DOMPool } from "./DOMPool";
import { Tokenizer } from "types/ml/Tokenizer";
import { GLOBAL_VARS, exit } from "common/processor";

export const ANCHOR_TAG = "a";

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
export async function processResource(
    resource: ResourceURL,
    time: number,
    formats: Set<string>,
    pool: PromisePool,
    processors: ResourceProcessor[]
) {
    const url = resource.toURL();
    const dictionary: Dictionary<Buffer | ResourceURL> = {};
    const filenames = [...formats];
    let buffersOrPaths: (ResourceURL | Buffer)[];
    try {
        buffersOrPaths = await Promise.all(filenames.map(filename => filenameToBufferOrPath(resource, time, filename)));
    } catch (e) {
        fancyLog(e.toString());
    }
    const length = buffersOrPaths.length;
    for (let i = 0; i < length; ++i) {
        const bufferOrPath = buffersOrPaths[i];
        if (bufferOrPath) {
            dictionary[filenames[i]] = bufferOrPath;
        }
    }
    const localFilenames = Object.keys(dictionary);
    const domPool = new DOMPool();
    let reDOM = true;
    for (const processor of processors) {
        if (processor.appliesTo(filenames, localFilenames, resource)) {
            console.log(`${time} ${(processor as any).__proto__.constructor.name} ${url} `);
            const from = processor.from();
            const inputFilenames = [...from];
            let input: Dictionary<Buffer | ResourceURL> = {}
            const length = inputFilenames.length;
            for (let i = 0; i < length; ++i) {
                const inputFilename = inputFilenames[i];
                input[inputFilename] = dictionary[inputFilename];
            }
            await pool.registerPromise(processor.apply(resource, input, time, domPool, reDOM));
        }
        reDOM = !processor.ro();
    }
}

export const buildProcessFunction = (processors: ResourceProcessor[]) =>
    async function process(lo: () => bigint, hi: () => bigint) {
        const pool = new PromisePool(1);
        const resources = await selectResourceVersions();
        outer: for (const url in resources) {
            const resource = new ResourceURL(url);
            const id = resource.getID();
            if (id < lo() || id >= hi()) continue;
            const versions = resources[url];
            for (const [time, filenames] of versions) {
                await processResource(resource, time, filenames, pool, processors);
                if (GLOBAL_VARS.safelyExit) break outer;
            }
        }
        await pool.flush();
    }
