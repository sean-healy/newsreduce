import { ResourceURL } from "types/db-objects/ResourceURL";
import { JSDOM } from "jsdom";
import { nodeToHitType } from "types/HitType";
import { VersionType } from "types/db-objects/VersionType";
import { htmlCollectionToArray, wordsFromNode } from "services/resource-processor/functions";
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

export function getTokens(dom: JSDOM) {
    HTMLProcessor.removeExcludedNodes(dom);
    const queryItems =
        htmlCollectionToArray(dom.window.document.querySelectorAll(INCLUDE_TAGS.join(",")));
    // Ensure no words are counted twice.
    for (const item of queryItems)
        item.parentNode.removeChild(item);
    const tokens: string[][] = [];
    for (const item of queryItems) {
        const nodeTokens = wordsFromNode(item, nodeToHitType(item));
        if (nodeTokens.length)
            tokens.push(nodeTokens);
    }

    return tokens;
}

export class ExtractTokens extends HTMLProcessor {
    ro() { return false; }
    async applyToDOM(resource: ResourceURL, dom: JSDOM, time?: number) {
        const tokens = getTokens(dom);
        await Promise.all([
            resource.writeVersion(time, VersionType.TOKENS, tokens.map(sentence => sentence.join(" ")).join("\n")),
        ]);
    }
    from() {
        return [VersionType.RAW_HTML];
    }
    to() {
        return [VersionType.TOKENS];
    }
}
