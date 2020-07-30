import { HTMLDocumentProcessor } from "services/html-processor/HTMLDocumentProcessor"
import { ResourceURL } from "types/objects/ResourceURL";
import { DOMWindow } from "jsdom";
import { nodeToHitType } from "types/HitType";
import { ResourceVersionType } from "types/objects/ResourceVersionType";
import { htmlCollectionToArray, wordsFromNode } from "services/html-processor/functions";
import { BagOfWords } from "types/BagOfWords";

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

export function getBagOfWords(window: DOMWindow) {
    HTMLDocumentProcessor.removeExcludedNodes(window);
    const queryItems =
        htmlCollectionToArray(window.document.querySelectorAll(INCLUDE_TAGS.join(",")));
    // Ensure no words are counted twice.
    for (const item of queryItems)
        item.parentNode.removeChild(item);
    const bag = new BagOfWords();
    for (const item of queryItems)
        for (const word of wordsFromNode(item, nodeToHitType(item)))
            bag.register(word);

    return bag;
}

export class ExtractRepresentations extends HTMLDocumentProcessor {
    ro() { return false; }
    async apply(window: DOMWindow, time?: number) {
        const resource = new ResourceURL(window.location.toString());
        const bag = getBagOfWords(window);
        const binaryBag = bag.toBinaryBag();
        await Promise.all([
            resource.writeVersion(time, ResourceVersionType.BAG_OF_WORDS, bag.toBuffer()),
            resource.writeVersion(time, ResourceVersionType.BINARY_BAG_OF_WORDS, binaryBag.toBuffer()),
        ]);
    }
}
