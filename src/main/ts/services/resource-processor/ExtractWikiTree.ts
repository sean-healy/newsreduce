import { ResourceURL } from "types/db-objects/ResourceURL";
import { JSDOM } from "jsdom";
import { WikiCategory } from "types/db-objects/WikiCategory";
import { WikiPage } from "types/db-objects/WikiPage";
import { DBObject } from "types/DBObject";
import { ResourceThrottle } from "types/db-objects/ResourceThrottle";
import { VersionType } from "types/db-objects/VersionType";
import { HTMLProcessor } from "./HTMLProcessor";
import { writeBigUInt96BE } from "common/util";

const SUBCATEGORY_SELECTOR = "#mw-subcategories .CategoryTreeItem>a";
const CATEGORY_PAGE_SELECT = "#mw-pages .mw-category .mw-category-group li>a";

export function getHrefs(dom: JSDOM, selector: string) {
    const node = dom.window.document.querySelectorAll(selector);
    const urls = new Array<string>(node.length);
    for (let i = 0; i < node.length; ++i) {
        const a = node.item(i) as HTMLAnchorElement;
        if (a.href) urls[i] = a.href;
    }

    return urls;
}

export function getSubWikiPages(wikiDoc: JSDOM) {
    return getHrefs(wikiDoc, CATEGORY_PAGE_SELECT);
}

export function getSubWikiCategories(wikiDoc: JSDOM) {
    return getHrefs(wikiDoc, SUBCATEGORY_SELECTOR);
}

export function getEntities(dom: JSDOM) {
    const parent = new ResourceURL(dom.window.location.toString());
    const subWikiCategoryURLs = getSubWikiCategories(dom);
    const subWikiPageURLs = getSubWikiPages(dom);
    const children = subWikiPageURLs.concat(subWikiCategoryURLs);
    const subCategories = children
        .map(child => new ResourceURL(child))
        .map(child => new WikiCategory({ parent, child }));
    const subPages = subWikiPageURLs
        .map(url => new WikiPage(url));
    const throttles = children.map(url => new ResourceThrottle(url, 7 * 24 * 60 * 60 * 1000));

    return {
        subCategories,
        subPages,
        throttles,
    };
}

export class ExtractWikiTree extends HTMLProcessor {
    ro() { return true; }
    resourceMatch(resource: ResourceURL) {
        return resource.ssl
            && resource.host.name === "en.wikipedia.org"
            && resource.port === 443
            && resource.path.value.match(/^\/wiki\/Category:/)
            && resource.query.value === "";
    }
    async applyToDOM(dom: JSDOM, time: number) {
        const { subCategories, subPages, throttles } = getEntities(dom);
        const dbPromises = [...subCategories, ...subPages, ...throttles]
            .map(entity => entity.enqueueInsert({ recursive: true }))
        const pageBuffer =
            Buffer.concat(subPages.map(o => o.resource.getID()).sort().map(id => writeBigUInt96BE(id)));
        const catBuffer =
            Buffer.concat(subCategories.map(o => o.child.getID()).sort().map(id => writeBigUInt96BE(id)));
        const resource = new ResourceURL(dom.window.location.toString());
        const fsPromises = [
            resource.writeVersion(time, VersionType.WIKI_PAGES, pageBuffer).then(() => {}),
            resource.writeVersion(time, VersionType.WIKI_CATS, catBuffer).then(() => {}),
        ];
        const promises = dbPromises.concat(fsPromises);
        await Promise.all<void>(promises);
    }
    from() {
        return new Set([VersionType.RAW_HTML.filename]);
    }
    to() {
        return new Set([VersionType.WIKI_PAGES.filename, VersionType.WIKI_CATS.filename]);
    }
}
