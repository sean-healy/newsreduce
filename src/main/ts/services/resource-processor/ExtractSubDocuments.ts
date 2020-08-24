import { JSDOM } from "jsdom";
import { ResourceURL } from "types/db-objects/ResourceURL";
import { VersionType } from "types/db-objects/VersionType";
import { HTMLProcessor, EXCLUDE } from "./HTMLProcessor";
import { Dictionary } from "utils/alpha";
import { ANCHOR_TAG } from "./functions";

const LF = Buffer.from("\n")[0];

export class ExtractSubDocuments extends HTMLProcessor {
    ro() { return true; }
    async applyToDOM(resource: ResourceURL, dom: JSDOM, time: number) {
        const body = dom.window.document.body;
        const stack: Element[] = [];
        stack.push(body);
        const stringBuilder = [];
        while (stack.length) {
            const parent = stack.pop();
            const children = parent.children;
            const length = children.length;
            if (length && parent.tagName.toLowerCase() !== ANCHOR_TAG) {
                for (let i = 0; i < length; ++i) {
                    const child = children.item(i);
                    if (!EXCLUDE.has(child.tagName.toUpperCase())) {
                        stack.push(child);
                    }
                }
            } else {
                let current = parent;
                const subDocument: Dictionary<string> = {};
                if (current.textContent)
                    subDocument.text = current.textContent;
                const attributes = current.attributes;
                for (let i = 0; i < attributes.length; ++i) {
                    let { name, value }= attributes.item(i);
                    if (name === "href")
                        subDocument[name] = (current as any).href;
                    else
                        subDocument[name] = value;
                }
                for (let [key, value] of Object.entries(subDocument)) {
                    if (!value) {
                        delete subDocument[key];
                        continue;
                    }
                    value = value.replace(/(\s|\n)+/g, " ")
                    if (!value) {
                        delete subDocument[key];
                        continue;
                    }
                    value = value.replace(/(^ )|( $)/g, "")
                    if (!value) {
                        delete subDocument[key];
                        continue;
                    }
                    subDocument[key] = value;
                }
                stringBuilder.push(Buffer.from(JSON.stringify(subDocument)));
                do {
                    if (current === parent) stringBuilder.push(Buffer.from("\t"));
                    else stringBuilder.push(Buffer.from(" "));
                    stringBuilder.push(Buffer.from(current.tagName.toLowerCase()));
                    if (current.className && typeof current.className === "string")
                        for (const c of current.className.split(/ +/g))
                            stringBuilder.push(Buffer.from(` .${c}`));
                    if (current.id)
                        stringBuilder.push(Buffer.from(` #${current.id}`));
                    current = current.parentElement;
                } while (current);
                stringBuilder.push(Buffer.from("\n"));
            }
        }
        stringBuilder.pop();
        const output = Buffer.concat(stringBuilder);
        await resource.writeVersion(time, VersionType.SUB_DOCS, output);
    }
    from() {
        return [VersionType.RAW_HTML];
    }
    to() {
        return [VersionType.SUB_DOCS];
    }
}
