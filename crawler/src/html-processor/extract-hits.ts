import { HTMLDocumentProcessor } from "./HTMLDocumentProcessor"
import { read, write, parseHitFile } from "../file";
import { FileFormat } from "../types/FileFormat";
import { JSDOM } from "jsdom";
import { generateURL, parseURL } from "../common/url";
import { getUrlID, getWordID } from "../common/ids";
import { Entity } from "../types/Entity";
import { CMP_BIG_INT } from "../common/util";

const EXCLUDE = [
    "NOSCRIPT",
    "SCRIPT",
    "FORM",
    "INPUT",
    "BUTTON",
    "STYLE",
];

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

enum HitType {
    TITLE,
    H1,
    H2,
    H3,
    H4,
    H5,
    H6,
    FIGCAPTION,
    STRONG,
    A,
    EM,
    BLOCKQUOTE,
    P,
    OTHER_TEXT,
    ACCESSABILITY_DATA,
    META_DATA,
};

const META_NAMES_CONSIDERED = [
    "description",
    "author",
    "keywords",
];

function nodeToHitType(node: Element) {
    let hitType: HitType;
    switch (node.tagName) {
        case "TITLE":
            hitType = HitType.TITLE;
            break;
        case "H1":
            hitType = HitType.H1;
            break;
        case "H2":
            hitType = HitType.H2;
            break;
        case "H3":
            hitType = HitType.H3;
            break;
        case "H4":
            hitType = HitType.H4;
            break;
        case "H5":
            hitType = HitType.H5;
            break;
        case "H6":
            hitType = HitType.H6;
            break;
        case "FIGCAPTION":
            hitType = HitType.FIGCAPTION;
            break;
        case "STRONG":
        case "B":
            hitType = HitType.STRONG;
            break;
        case "EM":
        case "I":
            hitType = HitType.EM;
            break;
        case "BLOCKQUOTE":
            hitType = HitType.BLOCKQUOTE;
            break;
        case "A":
            hitType = HitType.A;
            break;
        case "P":
            hitType = HitType.P;
            break;
        case "META":
            const name = node.getAttribute("name");
            if (name) {
                if (name in META_NAMES_CONSIDERED) {
                    hitType = HitType.META_DATA;
                } else {
                    hitType = HitType.OTHER_TEXT;
                }
            } else {
                const name = node.getAttribute("property");
                if (name in META_NAMES_CONSIDERED) {
                    hitType = HitType.META_DATA;
                } else {
                    hitType = HitType.OTHER_TEXT;
                }
            }
            break;
        default:
            if (node.hasAttribute("title") || node.hasAttribute("alt"))
                hitType = HitType.ACCESSABILITY_DATA;
            else
                hitType = HitType.OTHER_TEXT;
    }

    return hitType;
}

function nodeContent(node: Element, hitType: HitType) {
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
function processNode(node: Element, hitType: HitType) {
    const content = nodeContent(node, hitType);
    const lc = content.toLowerCase();
    const normalised = lc.replace(/[–-]/g, "");
    const words = normalised.match(/[^ \t\s!"'£$4€%^&*();:@~#\n®.,<>?/\[\]\\{}“”‘’]+/g);
    return words;
}

interface WordDataHit {
    hitType: number;
    words: string[];
};

export const process: HTMLDocumentProcessor = (window, resource, version, resourceID) => {
    const promises: Promise<unknown>[] = [];
    for (const tag of EXCLUDE) {
        const items = window.document.querySelectorAll(tag);
        for (let i = 0; i < items.length; ++i) {
            const item = items.item(i);
            item.parentElement.removeChild(item);
        }
    }
    const queryItems = window.document.querySelectorAll(INCLUDE_TAGS.join(","));
    const wordHitData: WordDataHit[] = [];
    let wordsOnPage = 0;
    // TODO fix me (hierarchical nodes can be counted twice.)
    for (let i = 0; i < queryItems.length; ++i) {
        const item = queryItems.item(i);
        item.parentNode.removeChild(item);
        const hitType = nodeToHitType(item);
        const words = processNode(item, hitType);
        if (words) {
            const data = {
                hitType,
                words
            };
            wordHitData.push(data);
            wordsOnPage += words.length;
        }
    }
    let wordOnPage = 0;
    const documentWords: Map<bigint, number[]> = new Map();
    let bytesUsed = 0;
    for (let i = 0; i < wordHitData.length; ++i) {
        const { words, hitType } = wordHitData[i];
        for (let j = 0; j < words.length; ++j) {
            const word = words[j];
            const wordID = getWordID(word).id
            const position = Math.floor(wordOnPage++ / wordsOnPage * (1 << 4));
            let wordHits: number[];
            if (documentWords.has(wordID)) {
                wordHits = documentWords.get(wordID);
            }
            else {
                // 8 bytes for a word ID, 2 bytes for the hit list length.
                bytesUsed += 10;
                wordHits = [];
                documentWords.set(wordID, wordHits);
            }
            wordHits.push((hitType << 4) | position);
            ++bytesUsed;
        }
    }
    const wordIDs = [...documentWords.keys()].sort(CMP_BIG_INT);
    const fileData = Buffer.alloc(bytesUsed);
    let offset = 0;
    for (const wordID of wordIDs) {
        fileData.writeBigUInt64BE(wordID, offset);
        offset += 8;
        const wordHits = documentWords.get(wordID).sort();
        const length = wordHits.length;
        fileData.writeUInt16BE(length, offset);
        offset += 2;
        fileData.copyWithin
        Buffer.from(wordHits).copy(fileData, offset);
        //console.log(wordID.toString(16), length, Buffer.from(wordHits).toString("hex"));
        offset += length;
    }
    if (resourceID === null)
        resourceID = getUrlID(generateURL(resource)).id;
    //console.log(fileData.length);
    promises.push(write(Entity.RESOURCE, resourceID, version, FileFormat.HITS, fileData));

    return promises;
}
