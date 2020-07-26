import { HTMLDocumentProcessor } from "services/html-processor/HTMLDocumentProcessor"
import { ResourceLink } from "types/objects/ResourceLink";
import { ResourceLinkHash } from "types/objects/ResourceLinkHash";
import { DBObject } from "types/DBObject";
import { DOMWindow } from "jsdom";
import { ResourceURL } from "types/objects/ResourceURL";
import { ResourceHash } from "types/objects/ResourceHash";
import { Anchor } from "types/objects/Anchor";
import { fancyLog } from "common/util";
import { ResourceVersionType } from "types/objects/ResourceVersionType";

const HASH = "#";
const ANCHOR_TAG = "a";

export function htmlCollectionToArray<T extends Element>(
    coll: HTMLCollectionOf<T> | NodeListOf<T>
) {
    const array = new Array<T>(coll.length);
    for (let position = 0; position < coll.length; ++position)
        array[position] = coll.item(position);

    return array;
}

export function getAnchorsWithHREF(window: DOMWindow) {
    const truthyAndFalseyAnchors =
        htmlCollectionToArray(window.document.getElementsByTagName(ANCHOR_TAG));

    return truthyAndFalseyAnchors.filter(a => a.href);
}

export function getLinks(window: DOMWindow) {
    const parent = new ResourceURL(window.location.toString());
    const links: DBObject<ResourceLink | ResourceLinkHash>[] = [];
    for (const anchor of getAnchorsWithHREF(window)) {
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
        if (hash)
            links.push(new ResourceLinkHash({ link, hash: new ResourceHash(hash) }));
        else links.push(link);
    }

    return links;
}

export class ExtractAHrefs extends HTMLDocumentProcessor {
    ro() { return true; }
    async apply(window: DOMWindow, time: number) {
        const parent = new ResourceURL(window.location.toString());
        const links = getLinks(window);
        const urls = links.map(item =>
            (item instanceof ResourceLinkHash ?
                item.link.child : (item as ResourceLink).child).toURL());
        const fsPromise =
            parent.writeVersion(time, ResourceVersionType.RAW_LINKS_TXT, urls.join("\n"))
                .then(async length => ResourceURL.registerVersionIfSuccessful(
                    parent, time, ResourceVersionType.WORD_HITS, length));
        const dbPromises = links.map(link => link.enqueueInsert({ recursive: true }));
        await Promise.all([...dbPromises, fsPromise]);
    }
}
