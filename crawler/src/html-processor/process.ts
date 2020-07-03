import { generateURL } from "../common/url";
import { JSDOM } from "jsdom";
import { selectHTMLToProcess } from "../data";
import { readLatestVersion } from "../file";
import { newRedis } from "../common/connections";
import { EVENT_LOG, FETCH_COMPLETE } from "../common/events";
import { FileFormat } from "../types/FileFormat";
import { Entity } from "../types/Entity";
import { process as process0 } from "./extract-ahrefs";
import { process as process1 } from "./extract-hits";
import { process as process2 } from "./extract-raw-text";
import { process as process3 } from "./extract-wiki-tree";
const PROCESSORS = [process0, process1, process2, process3];

let lock = false;
async function process() {
    if (lock) return;
    lock = true;
    const htmls = await selectHTMLToProcess();
    for (const resource of htmls) {
        const { file, ssl, hostname: host, port, path, query } = resource;
        const url = generateURL({ ssl, host, port, path, query });
        const promises: Promise<any>[] = [];
        const content = await readLatestVersion(Entity.RESOURCE, file, FileFormat.RAW_HTML)
        for (const process of PROCESSORS) {
            const dom = new JSDOM(content, { url });
            for (const promise of process(dom.window, resource, 1)) {
                promises.push(promise);
            }
        }
    }
    lock = false;
}

const events = newRedis("local");
events.subscribe(EVENT_LOG);
events.on("message", (_, msg) => {
    switch (msg) {
        case FETCH_COMPLETE: process();
    }
});
setInterval(process, 2000);
