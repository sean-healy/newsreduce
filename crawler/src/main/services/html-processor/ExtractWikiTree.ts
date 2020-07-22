import { HTMLDocumentProcessor } from "services/html-processor/HTMLDocumentProcessor"
import { ResourceURL } from "types/objects/ResourceURL";
import { DOMWindow } from "jsdom";
import { WikiCategory } from "types/objects/WikiCategory";
import { WikiPage } from "types/objects/WikiPage";
import { DBObject } from "types/DBObject";

const SUBCATEGORY_SELECTOR = "#mw-subcategories .CategoryTreeItem>a";
const CATEGORY_PAGE_SELECT = "#mw-pages .mw-category .mw-category-group li>a";

export function resourceIsWikiCategory(resource: ResourceURL) {
    return resource.ssl
        && resource.host.name === "en.wikipedia.org"
        && resource.port === 443
        && resource.path.value.match(/^\/wiki\/Category:/)
        && resource.query.value === "";
}

export function getHrefs(window: DOMWindow, selector: string) {
    const node = window.document.querySelectorAll(selector);
    const urls = new Array<string>(node.length);
    for (let i = 0; i < node.length; ++i) {
        const a = node.item(i) as HTMLAnchorElement;
        if (a.href) urls[i] = a.href;
    }

    return urls;
}

export function getSubWikiPages(wikiDoc: DOMWindow) {
    return getHrefs(wikiDoc, CATEGORY_PAGE_SELECT);
}

export function getSubWikiCategories(wikiDoc: DOMWindow) {
    return getHrefs(wikiDoc, SUBCATEGORY_SELECTOR);
}

export function getEntities(window: DOMWindow) {
    const parent = new ResourceURL(window.location.toString());
    if (!resourceIsWikiCategory(parent)) return [];

    const subWikiCategoryURLs = getSubWikiCategories(window);
    const subWikiPageURLs = getSubWikiPages(window);
    const children = subWikiPageURLs.concat(subWikiCategoryURLs);
    const relations: DBObject<any>[] = children
        .map(child => new ResourceURL(child))
        .map(child => new WikiCategory({ parent, child }));
    const pages: DBObject<any>[] = subWikiPageURLs
        .map(url => new WikiPage(url));

    return relations.concat(pages);
}

export class ExtractWikiTree extends HTMLDocumentProcessor {
    ro() { return true; }
    async apply(window: DOMWindow) {
        const entities = getEntities(window);
        const promises = entities.map(entity => entity.enqueueInsert({ recursive: true }));
        await Promise.all(promises);
    }
}
