import { ResourceURL } from "types/objects/ResourceURL";
import { JSDOM } from "jsdom";
import { WikiCategory } from "types/objects/WikiCategory";
import { WikiPage } from "types/objects/WikiPage";
import { DBObject } from "types/DBObject";
import { ResourceThrottle } from "types/objects/ResourceThrottle";
import { VersionType } from "types/objects/VersionType";
import { HTMLProcessor } from "./HTMLProcessor";

const SUBCATEGORY_SELECTOR = "#mw-subcategories .CategoryTreeItem>a";
const CATEGORY_PAGE_SELECT = "#mw-pages .mw-category .mw-category-group li>a";

export function resourceIsWikiCategory(resource: ResourceURL) {
    return resource.ssl
        && resource.host.name === "en.wikipedia.org"
        && resource.port === 443
        && resource.path.value.match(/^\/wiki\/Category:/)
        && resource.query.value === "";
}

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
    if (!resourceIsWikiCategory(parent)) return [];

    const subWikiCategoryURLs = getSubWikiCategories(dom);
    const subWikiPageURLs = getSubWikiPages(dom);
    const children = subWikiPageURLs.concat(subWikiCategoryURLs);
    const relations: DBObject<any>[] = children
        .map(child => new ResourceURL(child))
        .map(child => new WikiCategory({ parent, child }));
    const pages: DBObject<any>[] = subWikiPageURLs
        .map(url => new WikiPage(url));
    const throttles = children.map(url => new ResourceThrottle(url, 7 * 24 * 60 * 60 * 1000));

    return relations.concat(pages).concat(throttles);
}

export class ExtractWikiTree extends HTMLProcessor {
    ro() { return true; }
    async applyToDOM(dom: JSDOM) {
        const entities = getEntities(dom);
        const promises = entities.map(entity => entity.enqueueInsert({ recursive: true }));
        await Promise.all(promises);
    }
    from() {
        return new Set([VersionType.RAW_HTML_FILE]);
    }
    to() {
        return new Set([VersionType.WIKI_TREE_FILE]);
    }
}
