import { processWikiPages, deleteLegacyWikiCategories, processWikiCategories } from "../data";
import { HTMLDocumentProcessor } from "./HTMLDocumentProcessor"
import { ResourceURL } from "../types/objects/ResourceURL";

const SUBCATEGORY_SELECTOR = "#mw-subcategories .CategoryTreeItem>a";
const CATEGORY_PAGE_SELECT = "#mw-pages .mw-category .mw-category-group li>a";

function resourceIsWikiCategory(resource: ResourceURL) {
    return resource.ssl
        && resource.host.name === "en.wikipedia.org"
        && resource.port === 443
        && resource.path.value.match(/^\/wiki\/Category:/)
        && resource.query.value === "";
}

export const process: HTMLDocumentProcessor = (doc, resource) => {
    if (!resourceIsWikiCategory(resource)) return;

    const id = resource.getID();
    const promises: Promise<unknown>[] = [];
    const subcats = doc.querySelectorAll(SUBCATEGORY_SELECTOR);
    const pages: bigint[] = [];
    const relations: [bigint, bigint][] = [];
    const children: bigint[] = [];
    for (let i = 0; i < subcats.length; ++i) {
        const a = subcats.item(i) as HTMLAnchorElement;
        if (a.href) {
            const child = new ResourceURL(a.href).getID();
            relations.push([id, child]);
            children.push(child);
        }
    }
    const subpages = doc.querySelectorAll(CATEGORY_PAGE_SELECT);
    for (let i = 0; i < subpages.length; ++i) {
        const a = subpages.item(i) as HTMLAnchorElement;
        if (a.href) {
            const child = new ResourceURL(a.href).getID();
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
