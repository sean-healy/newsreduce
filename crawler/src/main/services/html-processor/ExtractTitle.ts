import { HTMLDocumentProcessor } from "services/html-processor/HTMLDocumentProcessor"
import { DOMWindow } from "jsdom";
import { ResourceVersionType } from "types/objects/ResourceVersionType";
import { ResourceTitle } from "types/objects/ResourceTitle";
import { ResourceURL } from "types/objects/ResourceURL";
import { Title } from "types/objects/Title";

export class ExtractTitle extends HTMLDocumentProcessor {
    ro() { return true; }
    async apply(window: DOMWindow, time: number) {
        const resource = new ResourceURL(window.location.toString());
        const titleContent = window.document.title;
        const title = new Title(titleContent);
        const resourceTitle = new ResourceTitle({ resource, title });
        const fsPromise = resource.writeVersion(time, ResourceVersionType.TITLE, titleContent);
        const dbPromise = resourceTitle.enqueueInsert({ recursive: true });
        const promises: Promise<any>[] = [dbPromise, fsPromise];
        await Promise.all(promises);
    }
}
