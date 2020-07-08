import { JSDOM } from "jsdom";
import { readLatestVersion } from "../file";
import { renewRedis } from "../common/connections";
import { FETCH_COMPLETE, HTML_PROCESS_COMPLETE } from "../common/events";
import { FileFormat } from "../types/FileFormat";
import { Entity } from "../types/Entity";
import { process as process0 } from "./extract-ahrefs";
import { process as process1 } from "./extract-hits";
import { process as process2 } from "./extract-raw-text";
import { process as process3 } from "./extract-wiki-tree";
import { ResourceURL } from "../types/objects/ResourceURL";
import { startProcessor } from "../common/processor";
const PROCESSORS = [process0, process1, process2, process3];

async function process() {
    let url: string;
    while (true) {
        url = await new Promise<string>((res, rej) => {
            renewRedis("processQueues").spop("html", async (err, url) => {
                if (err) rej(err);
                else res(url);
            });
        });
        if (!url) break;
        const resourceURL = new ResourceURL(url);
        const promises: Promise<any>[] = [];
        const content = await readLatestVersion(Entity.RESOURCE, resourceURL.getID(), FileFormat.RAW_HTML)
        for (const process of PROCESSORS)
            for (const promise of process(new JSDOM(content, { url }).window, resourceURL, 1))
                promises.push(promise);
        await Promise.all(promises);
    }
}

startProcessor(process, new Set([FETCH_COMPLETE]), HTML_PROCESS_COMPLETE);
