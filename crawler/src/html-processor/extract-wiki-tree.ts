import { processWikiPages, deleteLegacyWikiCategories, processWikiCategories } from "../data";
import { generateURL } from "../common/url";
import { HTMLDocumentProcessor } from "./HTMLDocumentProcessor"
import { ResourceURL } from "../types/Resource";
import { getUrlID } from "../common/ids";

const HASH = "#";
const SUBCATEGORY_SELECTOR = "#mw-subcategories .CategoryTreeItem>a";
const CATEGORY_PAGE_SELECT = "#mw-pages .mw-category .mw-category-group li>a";

function aHrefToUrlID(a: HTMLAnchorElement) {
    const url = a.href.split(HASH, 2)[0];

    return getUrlID(url).id
}

function resourceIsWikiCategory(resource: ResourceURL) {
    return resource.ssl && resource.host === "en.wikipedia.org" && resource.port === 443 && resource.path.match(/^\/wiki\/Category:/) && resource.query === "";
}

export const process: HTMLDocumentProcessor = (doc, resource) => {
    if (!resourceIsWikiCategory(resource)) return;

    const url = generateURL(resource);
    const id = getUrlID(url).id;
    const promises: Promise<unknown>[] = [];
    const subcats = doc.querySelectorAll(SUBCATEGORY_SELECTOR);
    const pages: bigint[] = [];
    const relations: [bigint, bigint][] = [];
    const children: bigint[] = [];
    for (let i = 0; i < subcats.length; ++i) {
        const a = subcats.item(i) as HTMLAnchorElement;
        if (a.href) {
            const child = aHrefToUrlID(a);
            relations.push([id, child]);
            children.push(child);
        }
    }
    const subpages = doc.querySelectorAll(CATEGORY_PAGE_SELECT);
    for (let i = 0; i < subpages.length; ++i) {
        const a = subpages.item(i) as HTMLAnchorElement;
        if (a.href) {
            const child = aHrefToUrlID(a);
            pages.push(child);
            relations.push([id, child]);
            children.push(child);
        }
    }
    promises.push(deleteLegacyWikiCategories(id, children));
    promises.push(processWikiPages(pages));
    promises.push(processWikiCategories(relations));

    return promises;
}
