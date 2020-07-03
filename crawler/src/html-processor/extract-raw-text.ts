import { HTMLDocumentProcessor } from "./HTMLDocumentProcessor"
import { read, write } from "../file";
import { FileFormat } from "../types/FileFormat";
import { JSDOM } from "jsdom";
import { generateURL, parseURL } from "../common/url";
import { getUrlID } from "../common/ids";
import { Entity } from "../types/Entity";

const EXCLUDE = [
    "NOSCRIPT",
    "SCRIPT",
    "STYLE",
    "FORM",
    "INPUT",
    "BUTTON",
];

export const process: HTMLDocumentProcessor = (doc, resource, version, resourceID?) => {
    const promises: Promise<unknown>[] = [];
    for (const tag of EXCLUDE) {
        const items = doc.querySelectorAll(tag);
        for (let i = 0; i < items.length; ++i) {
            const item = items.item(i);
            item.parentElement.removeChild(item);
        }
    }
    const rawText = doc.body.textContent.replace(/\n\s+\n/g, "\n\n").replace(/\n\n+/g, "\n\n");
    const id = getUrlID(generateURL(resource)).id;
    promises.push(write(Entity.RESOURCE, id, version, FileFormat.RAW_TXT, rawText));

    return promises;
}

read(Entity.RESOURCE, BigInt("10000004655985946181"), 1593227390681, FileFormat.RAW_HTML).then(content => {
    const dom = new JSDOM(content);
    const window = dom.window;
    process(window, parseURL("https://en.wikipedia.org/wiki/Blossom_tree_(graph_theory)"), 1593227390681);
});
