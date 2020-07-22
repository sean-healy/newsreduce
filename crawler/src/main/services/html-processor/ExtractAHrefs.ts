import { HTMLDocumentProcessor } from "services/html-processor/HTMLDocumentProcessor"
import { ResourceLink } from "types/objects/ResourceLink";
import { ResourceLinkHash } from "types/objects/ResourceLinkHash";
import { DBObject } from "types/DBObject";
import { DOMWindow } from "jsdom";
import { ResourceURL } from "types/objects/ResourceURL";
import { ResourceHash } from "types/objects/ResourceHash";
import { log } from "common/logging";

const HASH = "#";
const AHREF = "a";

export function getLinks(window: DOMWindow) {
    const parent = new ResourceURL(window.location.toString());
    const aHrefs = window.document.getElementsByTagName(AHREF);
    const links: DBObject<ResourceLink | ResourceLinkHash>[] = [];
    for (let position = 0; position < aHrefs.length; ++position) {
        const a: HTMLAnchorElement = aHrefs.item(position);
        if (a.href) {
            const parts = a.href.split(HASH, 2);
            const url: string = parts[0];
            const hash: string = parts.length > 1 ? parts[1] : "";
            let child: ResourceURL;
            try {
                child = new ResourceURL(url);
                const link = new ResourceLink({ parent, child });
                if (hash) links.push(new ResourceLinkHash({ link, hash: new ResourceHash(hash) }));
                else links.push(link);
            } catch (parseError) {
                log("invalid url", parseError);
            }
        }
    }

    return links;
}

export class ExtractAHrefs extends HTMLDocumentProcessor {
    ro() { return true; }
    async apply(window: DOMWindow) {
        const links = getLinks(window);
        await Promise.all(links.map(link => link.enqueueInsert({ recursive: true })));
    }
}
