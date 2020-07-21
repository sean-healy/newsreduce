import fetch, { Response } from "node-fetch";
import {
    crawlAllowed,
    throttle,
} from "data";
import { FileFormat } from "types/FileFormat";
import { log } from "common/logging";
import { FetchedResource } from "types/objects/FetchedResource";
import { ResourceURL } from "types/objects/ResourceURL";
import { milliTimestamp } from "common/time";
import { Host } from "types/objects/Host";
import { ResourceHeader } from "types/objects/ResourceHeader";
import { Redis, REDIS_PARAMS } from "common/Redis";
import { fancyLog } from "common/util";
import { ResourceVersion } from "types/objects/ResourceVersion";
import { ResourceVersionType } from "types/objects/ResourceVersionType";

export function buildOnFetch(url: string) {
    return async (response: Response) => {
        const resource = new ResourceURL(url);
        let type: string;
        const time = milliTimestamp();
        let promises = [];
        const actualLength = await resource.writeVersion(
            time, FileFormat.RAW_HTML, response.body);
        let headers = [];
        response.headers.forEach(async (value, anyCaseKey) => {
            headers.push(`${anyCaseKey}: ${value}`);
            const key = anyCaseKey.toLowerCase();
            const resourceHeader = new ResourceHeader(url, key, value)
            promises.push(resourceHeader.enqueueInsert({ recursive: true }));
            if (key === "content-type") {
                type = value.toLowerCase();
                const fetchedResource =
                    new FetchedResource(url, actualLength, type);
                promises.push(
                    fetchedResource.enqueueInsert({ recursive: true }));
            }
        });
        const headerContent = headers.join("\n");
        if (!headerContent) {
            log("header issue");
            log(JSON.stringify(headers));
        }
        promises.push(resource.writeVersion(
            time, FileFormat.RAW_HEADERS, headerContent).then(async () => {
                await new ResourceVersion({
                    resource, time, type: ResourceVersionType.RAW_HTML,
                }).enqueueInsert({ recursive: true });
            }));

        await Promise.all(promises);
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
        log("Got hosts from redis:", JSON.stringify(hostnames));
        const hostIDs =
            hostnames.map(hostname => new Host({ name: hostname }).getID());
        const throttleList =
            (await new Host().bulkSelect(hostIDs, ["name", "throttle"]));
        const throttles: { [key: string]: number } = {};
        for (const row of throttleList)
            throttles[row.name] = Number(row.throttle);
        log("Throttles for hosts", JSON.stringify(throttles));
        for (const hostname of hostnames) {
            const host = new Host({ name: hostname });
            const id = host.getID();
            if (id >= lo() && id < hi()) {
                log(`Host within range(${lo()} -- > ${hi()}: ${host.name}`);
                const allowed = await crawlAllowed(hostname);
                if (allowed) {
                    const resourceURL =
                        await ResourceURL.popForFetching(hostname);
                    if (resourceURL && resourceURL.isValid()) {
                        fancyLog(JSON.stringify(resourceURL));
                        const url = resourceURL.toURL();
                        throttle(hostname, throttles[hostname]);
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
