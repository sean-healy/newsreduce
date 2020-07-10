import { HTMLDocumentProcessor } from "services/html-processor/HTMLDocumentProcessor"
import { write } from "file";
import { FileFormat } from "types/FileFormat";
import { Entity } from "types/Entity";
import { CMP_BIG_INT, writeBigUInt96BE } from "common/util";
import { Word } from "types/objects/Word";
import { ResourceURL } from "types/objects/ResourceURL";
import { DOMWindow } from "jsdom";
import { HitType, nodeToHitType } from "types/HitType";
import { removeExcludedNodes } from "./functions";
import { Hits } from "types/Hits";
import { HitList } from "types/HitList";

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
    const words = normalised.match(/[^ \t\s!"'£$4€%^&*();:@~#\n®.,<>?/\[\]\\{}“”‘’]+/g);
    return words;
}

interface BlockData {
    hitType: number;
    words: string[];
};

export function toHitList(window: DOMWindow) {
    removeExcludedNodes(window);
    const queryItems = window.document.querySelectorAll(INCLUDE_TAGS.join(","));
    const blockData: BlockData[] = [];
    // Ensure no words are counted twice.
    for (let i = 0; i < queryItems.length; ++i) {
        const item = queryItems.item(i);
        item.parentNode.removeChild(item);
    }
    let wordsOnPage = 0;
    for (let i = 0; i < queryItems.length; ++i) {
        const item = queryItems.item(i);
        const hitType = nodeToHitType(item);
        const words = wordsFromNode(item, hitType);
        if (words) {
            blockData.push({ hitType, words });
            wordsOnPage += words.length;
        }
    }
    let n = 0;
    const hits: Hits = new Hits();
    for (const block of blockData)
        for (const word of block.words)
            hits.register(word, n++, wordsOnPage, block.hitType);

    return hits;
}

export const process: HTMLDocumentProcessor = (window, version) => {
    const promises: Promise<unknown>[] = [];
    const resource = new ResourceURL(window.location.toString());
    const fileData = toHitList(window);
    promises.push(write(Entity.RESOURCE, resource.getID(), version, FileFormat.HITS, fileData));

    return Promise.all(promises) as any;
}
