import { ResourceLink } from "types/objects/ResourceLink";
import { ResourceLinkHash } from "types/objects/ResourceLinkHash";
import { DBObject } from "types/DBObject";
import { JSDOM } from "jsdom";
import { ResourceURL } from "types/objects/ResourceURL";
import { ResourceHash } from "types/objects/ResourceHash";
import { Anchor } from "types/objects/Anchor";
import { fancyLog } from "common/util";
import { VersionType } from "types/objects/VersionType";
import { getAnchorsWithHREF } from "services/resource-processor/functions";
import { HTMLProcessor } from "./HTMLProcessor";

const HASH = "#";

export function getLinks(dom: JSDOM) {
    const parent = new ResourceURL(dom.window.location.toString());
    const links: DBObject<ResourceLink | ResourceLinkHash>[] = [];
    for (const anchor of getAnchorsWithHREF(dom)) {
        const parts = anchor.href.split(HASH, 2);
        const url: string = parts[0];
        const hash: string = parts.length > 1 ? parts[1] : "";
        const value = new Anchor({ value: anchor.innerHTML });
        let child: ResourceURL;
        try {
            child = new ResourceURL(url);
        } catch (e) {
            fancyLog("invalid url: " + url);
            fancyLog(JSON.stringify(e));
            continue;
        }
        const link = new ResourceLink({ parent, child, value });
        if (hash) links.push(new ResourceLinkHash({ link, hash: new ResourceHash(hash) }));
        else links.push(link);
    }

    return links;
}

export class ExtractAHrefs extends HTMLProcessor {
    ro() { return true; }
    from() {
        return new Set([VersionType.RAW_HTML_FILE]);
    }
    to() {
        return new Set([VersionType.RAW_LINKS_TXT_FILE]);
    }
    async applyToDOM(dom: JSDOM, time: number) {
        const parent = new ResourceURL(dom.window.location.toString());
        const links = getLinks(dom);
        const urls = links.map(item =>
            item instanceof ResourceLinkHash ? `${item.link.child.toURL()}#${item.hash.value}` : (item as ResourceLink).child.toURL());
        const fsPromise = parent.writeVersion(time, VersionType.RAW_LINKS_TXT, urls.join("\n"));
        const dbPromises = links.map(link => link.enqueueInsert({ recursive: true }));
        const promises: Promise<any>[] = [...dbPromises, fsPromise];
        await Promise.all(promises);
    }
}
