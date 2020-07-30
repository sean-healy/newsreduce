import { HTMLDocumentProcessor } from "services/html-processor/HTMLDocumentProcessor"
import { ResourceURL } from "types/objects/ResourceURL";
import { DOMWindow } from "jsdom";
import { HitType, nodeToHitType } from "types/HitType";
import { ResourceVersionType } from "types/objects/ResourceVersionType";
import { WordHits } from "types/WordHits";
import { LinkHits } from "types/LinkHits";
import { getAnchorsWithHREF, htmlCollectionToArray } from "services/html-processor/functions";
import { wordsFromNode } from "services/html-processor/functions";

const INCLUDE_TAGS = [
    "TITLE",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "FIGCAPTION",
    "STRONG",
    "B",
    "A",
    "EM",
    "I",
    "BLOCKQUOTE",
    "P",
    "META",
];

interface BlockData {
    hitType: HitType;
    items: string[];
};

export function getHits(window: DOMWindow) {
    HTMLDocumentProcessor.removeExcludedNodes(window);
    const queryItems =
        htmlCollectionToArray(window.document.querySelectorAll(INCLUDE_TAGS.join(",")));
    const blockWordData: BlockData[] = [];
    const linksData: [string, HitType][] = [];
    const truthyAnchors = getAnchorsWithHREF(window);
    for (const anchor of truthyAnchors)
        linksData.push([anchor.href, nodeToHitType(anchor.parentElement)]);
    // Ensure no words are counted twice.
    for (const item of queryItems)
        item.parentNode.removeChild(item);
    let wordsOnPage = 0;
    for (const item of queryItems) {
        const hitType = nodeToHitType(item);
        const words = wordsFromNode(item, hitType);
        if (words && words.length) {
            blockWordData.push({ hitType, items: words });
            wordsOnPage += words.length;
        }
    }
    let n = 0;
    const wordHits = new WordHits();
    for (const block of blockWordData)
        for (const word of block.items)
            wordHits.register(word, n++, wordsOnPage, block.hitType);
    n = 0;
    const linkHits = new LinkHits();
    for (const [url, hitType] of linksData)
        n = linkHits.register(url, n, linksData.length, hitType);

    return { wordHits, linkHits };
}

export class ExtractHits extends HTMLDocumentProcessor {
    ro() { return false; }
    async apply(window: DOMWindow, time?: number) {
        const resource = new ResourceURL(window.location.toString());
        const { wordHits, linkHits } = getHits(window);
        await Promise.all([
            resource.writeVersion(time, ResourceVersionType.LINK_HITS, linkHits.toBuffer()),
            resource.writeVersion(time, ResourceVersionType.WORD_HITS, wordHits.toBuffer()),
        ]);
    }
}
