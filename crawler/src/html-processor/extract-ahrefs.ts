import { HTMLDocumentProcessor } from "./HTMLDocumentProcessor"
import { ResourceLink } from "../types/objects/ResourceLink";
import { ResourceLinkHash } from "../types/objects/ResourceLinkHash";
import { DBObject } from "../types/DBObject";
import { DOMWindow } from "jsdom";

const HASH = "#";
const AHREF = "a";

export function getLinks(doc: DOMWindow) {
    const aHrefs = doc.getElementsByTagName(AHREF);
    const links: DBObject<ResourceLink | ResourceLinkHash>[] = [];
    for (let position = 0; position < aHrefs.length; ++position) {
        const a: HTMLAnchorElement = aHrefs.item(position);
        if (a.href) {
            const parts = a.href.split(HASH, 2);
            const url: string = parts[0];
            const hash: string = parts.length > 1 ? parts[1] : "";
            if (hash) links.push(new ResourceLinkHash(doc.location.toString(), url, hash));
            else links.push(new ResourceLink(doc.location.toString(), url));
        }
    }

    return links;
}

export const process: HTMLDocumentProcessor = doc => {
    for (const link of getLinks(doc)) link.enqueueInsert({ recursive: true });

    return [];
}
