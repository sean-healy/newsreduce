import { HTMLDocumentProcessor } from "services/html-processor/HTMLDocumentProcessor"
import { ResourceURL } from "types/objects/ResourceURL";
import { DOMWindow } from "jsdom";
import { HitType, nodeToHitType } from "types/HitType";
import { ResourceVersionType } from "types/objects/ResourceVersionType";
import { WordHits } from "types/WordHits";
import { fancyLog } from "common/util";
import { LinkHits } from "types/LinkHits";
import { getAnchorsWithHREF, htmlCollectionToArray } from "./ExtractAHrefs";

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

function contentFromNode(node: Element, hitType: HitType) {
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
function wordsFromNode(node: Element, hitType: HitType) {
    const content = contentFromNode(node, hitType);
    const lc = content.toLowerCase();
    const normalised = lc.replace(/[–-]/g, "");
    const words = normalised.match(/[^ \t\s!"'^&*();:@~#\n®.,<>?/\[\]\\{}“”‘’]+/g);
    return words;
}

function urlsFromNode(node: Element) {
    const anchors = node.querySelectorAll("a");
    const length = anchors.length;
    const urls: string[] = [];
    for (let i = 0; i < length; ++i) {
        const item = anchors.item(i);
        const url = item.href;
        try {
            const resource = new ResourceURL(url);
            urls.push(resource.toURL());
        } catch (e) {
            fancyLog(`unhandled url: ${url}`);
            fancyLog(JSON.stringify(e));
        }
    }

    return urls;
}

interface BlockData<T> {
    hitType: HitType;
    items: T[];
};

export function getHits(window: DOMWindow) {
    HTMLDocumentProcessor.removeExcludedNodes(window);
    const queryItems =
        htmlCollectionToArray(window.document.querySelectorAll(INCLUDE_TAGS.join(",")));
    const blockWordData: BlockData<string>[] = [];
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
