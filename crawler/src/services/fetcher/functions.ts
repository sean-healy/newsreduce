import fetch, { Response } from "node-fetch";
import {
    crawlAllowed,
    throttle,
    getRedisKeys,
} from "data";
import { FileFormat } from "types/FileFormat";
import { log } from "common/logging";
import { FetchedResource } from "types/objects/FetchedResource";
import { ResourceURL } from "types/objects/ResourceURL";
import { milliTimestamp } from "common/time";
import { Host } from "types/objects/Host";
import { ResourceHeader } from "types/objects/ResourceHeader";
import { REDIS_PARAMS, renewRedis } from "common/connections";

export function buildOnFetch(url: string) {
    return async (response: Response) => {
        const resourceURL = new ResourceURL(url);
        let type: string;
        const now = milliTimestamp();
        let promises = [];
        const actualLength = await resourceURL.writeVersion(now, FileFormat.RAW_HTML, response.body);
        let headers = [];
        response.headers.forEach(async (value, anyCaseKey) => {
            headers.push(`${anyCaseKey}: ${value}`);
            const key = anyCaseKey.toLowerCase();
            const resourceHeader = new ResourceHeader(url, key, value)
            promises.push(resourceHeader.enqueueInsert({ recursive: true }));
            if (key === "content-type") {
                type = value.toLowerCase();
                const fetchedResource = new FetchedResource(url, actualLength, type);
                promises.push(fetchedResource.enqueueInsert({ recursive: true }));
            }
        });
        const headerContent = headers.join("\n");
        if (!headerContent) {
            log("header issue");
            log(JSON.stringify(headers));
        }
        promises.push(resourceURL.writeVersion(now, FileFormat.RAW_HEADERS, headerContent));

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
        hostnames = await getRedisKeys(REDIS_PARAMS.fetchSchedule);
        log("Got hosts from redis:", JSON.stringify(hostnames));
        const hostIDs = hostnames.map(hostname => new Host({ name: hostname }).getID());
        const throttleList = (await new Host().bulkSelect(hostIDs, ["name", "throttle"]));
        const throttles: { [key: string]: number } = {};
        for (const row of throttleList) throttles[row.name] = Number(row.throttle);
        log("Throttles for hosts", JSON.stringify(throttles));
        for (const hostname of hostnames) {
            const host = new Host({ name: hostname });
            const id = host.getID();
            if (id >= lo() && id < hi()) {
                log(`Host within range(${lo()} -- > ${hi()}: ${host}`);
                if (await crawlAllowed(hostname)) {
                    const resourceURL = await ResourceURL.popForFetching(hostname);
                    if (resourceURL) {
                        const url = resourceURL.toURL();
                        console.log(url);
                        throttle(hostname, throttles[hostname]);
                        await fetchAndWrite(url);
                        renewRedis(REDIS_PARAMS.processQueues).sadd("html", url)
                        fetched.add(url);
                    }
                }
            };
        }
    } while (hostnames.length !== 0);

    return fetched;
}
