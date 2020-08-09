import { ResourceLink } from "types/db-objects/ResourceLink";
import { ResourceLinkHash } from "types/db-objects/ResourceLinkHash";
import { DBObject } from "types/DBObject";
import { JSDOM } from "jsdom";
import { ResourceURL } from "types/db-objects/ResourceURL";
import { ResourceHash } from "types/db-objects/ResourceHash";
import { Anchor } from "types/db-objects/Anchor";
import { fancyLog } from "common/util";
import { VersionType } from "types/db-objects/VersionType";
import { getAnchorsWithHREF, ANCHOR_TAG } from "services/resource-processor/functions";
import { HTMLProcessor } from "./HTMLProcessor";

const HASH = "#";
const LF = Buffer.from("\n")[0];

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

export class ExtractAnchorPaths extends HTMLProcessor {
    ro() { return true; }
    from() {
        return new Set([VersionType.RAW_HTML.filename]);
    }
    to() {
        return new Set([VersionType.ANCHOR_PATHS.filename]);
    }
    async applyToDOM(dom: JSDOM, time: number) {
        const body = dom.window.document.body;
        const stack: [number, Element][] = [];
        stack.push([0, body]);
        const anchors = dom.window.document.querySelectorAll(ANCHOR_TAG);
        const aLength = anchors.length;
        let stringBuilder: Buffer[] = []
        for (let i = 0; i < aLength; ++i) {
            const anchor = anchors.item(i);
            let url: ResourceURL;
            try {
                url = new ResourceURL(anchor.href);
            } catch (e) {
                url = null;
            }
            if (url) {
                stringBuilder.push(Buffer.from(`${url.toURL()}\t`));
                let current: HTMLElement = anchor;
                do {
                    const tag = current.tagName.toLowerCase();
                    const id = current.id;
                    const classes = current.className;
                    stringBuilder.push(Buffer.from(`${tag} ${id ? `#${id} ` : ""}`));
                    if (classes)
                        for (const c of classes.split(" ").sort())
                            stringBuilder.push(Buffer.from(`.${c} `));
                    current = current.parentElement;
                } while (current);
                const lastBuffer = stringBuilder[stringBuilder.length - 1];
                lastBuffer[lastBuffer.length - 1] = LF;
            }
        }
        const lastIndex = stringBuilder.length - 1;
        const lastBuffer = stringBuilder[lastIndex];
        stringBuilder[lastIndex] = lastBuffer.slice(0, lastBuffer.length - 1);
        const resource = new ResourceURL(dom.window.location.toString());
        const buffer = Buffer.concat(stringBuilder).toString();
        await resource.writeVersion(time, VersionType.ANCHOR_PATHS, buffer);
    }
}
