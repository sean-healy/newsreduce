import { JSDOM } from "jsdom";
import { VersionType } from "types/db-objects/VersionType";
import { ResourceTitle } from "types/db-objects/ResourceTitle";
import { ResourceURL } from "types/db-objects/ResourceURL";
import { Title } from "types/db-objects/Title";
import { HTMLProcessor } from "./HTMLProcessor";

export class ExtractTitle extends HTMLProcessor {
    async applyToDOM(dom: JSDOM, time: number) {
        const resource = new ResourceURL(dom.window.location.toString());
        const titleContent = dom.window.document.title;
        const title = new Title(titleContent);
        const resourceTitle = new ResourceTitle({ resource, title });
        const fsPromise = resource.writeVersion(time, VersionType.TITLE, titleContent);
        const dbPromise = resourceTitle.enqueueInsert({ recursive: true });
        const promises: Promise<any>[] = [dbPromise, fsPromise];
        await Promise.all(promises);
    }
    from() {
        return new Set([VersionType.RAW_HTML.filename]);
    }
    to() {
        return new Set([VersionType.TITLE.filename]);
    }
}
