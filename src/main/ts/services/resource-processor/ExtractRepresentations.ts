import { ResourceURL } from "types/db-objects/ResourceURL";
import { JSDOM } from "jsdom";
import { nodeToHitType } from "types/HitType";
import { VersionType } from "types/db-objects/VersionType";
import { htmlCollectionToArray, wordsFromNode } from "services/resource-processor/functions";
import { BagOfWords } from "types/ml/BagOfWords";
import { HTMLProcessor } from "./HTMLProcessor";

const INCLUDE_TAGS = [
    "TITLE",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "FIGCAPTION",
    "BLOCKQUOTE",
    "P",
];

export function getBagOfWords(dom: JSDOM) {
    HTMLProcessor.removeExcludedNodes(dom);
    const queryItems =
        htmlCollectionToArray(dom.window.document.querySelectorAll(INCLUDE_TAGS.join(",")));
    // Ensure no words are counted twice.
    for (const item of queryItems)
        item.parentNode.removeChild(item);
    const bag = new BagOfWords();
    for (const item of queryItems) {
        const words = wordsFromNode(item, nodeToHitType(item));
        if (words) for (const word of words)
            bag.register(word);
    }
    for (const word of bag.objects.values()) word.enqueueInsert({ recursive: true });

    return bag;
}

export class ExtractRepresentations extends HTMLProcessor {
    ro() { return false; }
    async applyToDOM(dom: JSDOM, time?: number) {
        const resource = new ResourceURL(dom.window.location.toString());
        const bag = getBagOfWords(dom);
        const binaryBag = bag.toBinaryBag();
        await Promise.all([
            resource.writeVersion(time, VersionType.BAG_OF_WORDS, bag.toBuffer()),
            resource.writeVersion(time, VersionType.BINARY_BAG_OF_WORDS, binaryBag.toBuffer()),
        ]);
    }
    from() {
        return new Set([VersionType.RAW_HTML.filename]);
    }
    to() {
        return new Set([VersionType.BAG_OF_WORDS.filename, VersionType.BINARY_BAG_OF_WORDS.filename]);
    }
}
