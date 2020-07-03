import { processURLs, processResourceLinks } from "../data";
import { HTMLDocumentProcessor } from "./HTMLDocumentProcessor"
import { getUrlID } from "../common/ids";

const HASH = "#";
const AHREF = "a";

export const process: HTMLDocumentProcessor = doc => {
    const aHrefs = doc.getElementsByTagName(AHREF);
    const links = [];
    const urls = [];
    const promises: Promise<unknown>[] = [];
    for (let position = 0; position < aHrefs.length; ++position) {
        const a: HTMLAnchorElement = aHrefs.item(position);
        if (a.href) {
            const parts = a.href.split(HASH, 2);
            const url: string = parts[0];
            const hash: string = parts.length > 1 ? parts[1] : "";
            const output = getUrlID(url)
            if (output) {
                const child = output.id;
                urls.push(url);
                links.push([parent, position, child]);
            }
        }
    }
    promises.push(processURLs(urls).promise);
    promises.push(processResourceLinks(links));

    return promises;
}
