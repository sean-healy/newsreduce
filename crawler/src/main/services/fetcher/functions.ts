import fetch, { Response } from "node-fetch";
import { log } from "common/logging";
import { ResourceURL } from "types/objects/ResourceURL";
import { milliTimestamp } from "common/time";
import { Host } from "types/objects/Host";
import { ResourceHeader } from "types/objects/ResourceHeader";
import { Redis, REDIS_PARAMS } from "common/Redis";
import { fancyLog } from "common/util";
import { ResourceVersionType } from "types/objects/ResourceVersionType";
import { DBObject } from "types/DBObject";

export function buildOnFetch(url: string) {
    return async (response: Response) => {
        const resource = new ResourceURL(url);
        const time = milliTimestamp();
        let headers = [];
        let objects: DBObject<any>[] = [];
        response.headers.forEach(async (value, anyCaseKey) => {
            headers.push(`${anyCaseKey}: ${value}`);
            const key = anyCaseKey.toLowerCase();
            objects.push(new ResourceHeader(url, key, value));
            if (key === "content-type") {
                const mimeType = value.toLowerCase();
                let type: ResourceVersionType = null;
                if (mimeType.match(/^text\/html/))
                    type = ResourceVersionType.RAW_HTML;
                if (type !== null)
                    await resource.writeVersion(time, type, response.body);
            }
        });
        const headerContent = headers.join("\n");
        if (!headerContent) {
            log("header issue");
            log(JSON.stringify(headers));
        }
        await resource.writeVersion(time, ResourceVersionType.RAW_HEADERS, headerContent)
        await Promise.all(objects.map(obj => obj.enqueueInsert({ recursive: true })));
    };
}

export async function fetchAndWrite(url: string) {
    await fetch(url).then(buildOnFetch(url));
}

export async function pollAndFetch(lo: () => bigint, hi: () => bigint) {
    let hostnames: string[];
    let fetched = new Set<string>();
    do {
        hostnames = await Redis.renewRedis(REDIS_PARAMS.fetchSchedule).keys();
        const hostIDs = hostnames.map(hostname => new Host({ name: hostname }).getID());
        const throttleList = (await new Host().bulkSelect(hostIDs, ["name", "throttle"]));
        const throttles: { [key: string]: number } = {};
        for (const row of throttleList) throttles[row.name] = Number(row.throttle);
        for (const hostname of hostnames) {
            const host = new Host({ name: hostname, throttle: throttles[hostname] });
            const id = host.getID();
            if (id >= lo() && id < hi()) {
                const allowed = await host.crawlAllowed();
                if (allowed) {
                    const resource = new ResourceURL(await host.popURLForFetching());
                    if (resource.isValid()) {
                        await resource.setFetchLock();
                        const url = resource.toURL();
                        await host.applyThrottle();
                        await fetchAndWrite(url);
                        fancyLog(url);
                        Redis.renewRedis(REDIS_PARAMS.general).sadd("html", url)
                        fetched.add(url);
                    }
                }
            };
        }
    } while (hostnames.length !== 0);

    return fetched;
}
