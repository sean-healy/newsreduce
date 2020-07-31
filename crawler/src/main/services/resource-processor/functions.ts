import { JSDOM } from "jsdom";
import { ResourceProcessor } from "services/resource-processor/ResourceProcessor";
import { selectResourceVersions } from "data";
import { Dictionary, fancyLog } from "common/util";
import { ResourceVersionType } from "types/objects/ResourceVersionType";
import { PromisePool } from "common/PromisePool";
import { HitType } from "types/HitType";
import { ResourceURL } from "types/objects/ResourceURL";
import { DOMPool } from "./DOMPool";

const ANCHOR_TAG = "a";

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
    const lc = content.toLowerCase();
    const normalised = lc.replace(/[–-]/g, "");
    const words = normalised.match(/[^ \t\s!"'^&*();:@~#\n®.,<>?/\[\]\\{}“”‘’]+/g);
    return words;
}

function filenameToBufferOrPath(resource: ResourceURL, time: number, filename: string): Promise<Buffer | ResourceURL> {
    switch (filename) {
        case ResourceVersionType.RAW_ZIP_FILE:
            return new Promise<ResourceURL>(res => res(resource));
        default: return resource.read(time, new ResourceVersionType(filename))
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
    console.log(`${time} ${url}`);
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
        if (bufferOrPath) dictionary[filenames[i]] = bufferOrPath;
    }
    const localFilenames = Object.keys(dictionary);
    const domPool = new DOMPool();
    let reDOM = true;
    for (const processor of processors) {
        if (processor.appliesTo(localFilenames, resource)) {
            const from = processor.from();
            const inputFilenames = [...from];
            let input: Dictionary<Buffer | ResourceURL> = {}
            const length = inputFilenames.length;
            for (let i = 0; i < length; ++i)
                input[inputFilenames[i]] = dictionary[i];
            await pool.registerPromise(processor.apply(resource, input, time, domPool, reDOM));
        }
        reDOM = !processor.ro();
    }
}

export const buildProcessFunction = (processors: ResourceProcessor[]) =>
    async function process(lo: () => bigint, hi: () => bigint) {
        const pool = new PromisePool(1);
        const resources = await selectResourceVersions();
        for (const url in resources) {
            const resource = new ResourceURL(url);
            const id = resource.getID();
            if (id < lo() || id >= hi()) continue;
            const versions = resources[url];
            for (const [time, filenames] of versions) {
                await processResource(resource, time, filenames, pool, processors);
            }
        }
        await pool.flush();
    }
