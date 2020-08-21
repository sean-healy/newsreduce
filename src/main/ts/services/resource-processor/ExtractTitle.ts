import { JSDOM } from "jsdom";
import { VersionType } from "types/db-objects/VersionType";
import { ResourceTitle } from "types/db-objects/ResourceTitle";
import { Title } from "types/db-objects/Title";
import { HTMLProcessor } from "./HTMLProcessor";
import { ResourceURL } from "types/db-objects/ResourceURL";

export class ExtractTitle extends HTMLProcessor {
    async applyToDOM(resource: ResourceURL, dom: JSDOM, time: number) {
        const titleContent = dom.window.document.title;
        const title = new Title(titleContent);
        const resourceTitle = new ResourceTitle({ resource, title });
        const fsPromise = resource.writeVersion(time, VersionType.TITLE, titleContent);
        const dbPromise = resourceTitle.enqueueInsert({ recursive: true });
        const promises: Promise<any>[] = [dbPromise, fsPromise];
        await Promise.all(promises);
    }
    from() {
        return [VersionType.RAW_HTML];
    }
    to() {
        return [VersionType.TITLE];
    }
}
