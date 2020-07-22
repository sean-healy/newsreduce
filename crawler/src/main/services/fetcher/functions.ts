import fetch, { Response } from "node-fetch";
import {
    crawlAllowed,
    throttle,
} from "data";
import { FileFormat } from "types/FileFormat";
import { log } from "common/logging";
import { ResourceURL } from "types/objects/ResourceURL";
import { milliTimestamp } from "common/time";
import { Host } from "types/objects/Host";
import { ResourceHeader } from "types/objects/ResourceHeader";
import { Redis, REDIS_PARAMS } from "common/Redis";
import { fancyLog } from "common/util";
import { ResourceVersion } from "types/objects/ResourceVersion";
import { ResourceVersionType } from "types/objects/ResourceVersionType";
import { DBObject } from "types/DBObject";

export function buildOnFetch(url: string) {
    return async (response: Response) => {
        const resource = new ResourceURL(url);
        //fancyLog(JSON.stringify(resource));
        const time = milliTimestamp();
        const bodyLength = await resource.writeVersion(time, FileFormat.RAW_HTML, response.body);
        let headers = [];
        let objects: DBObject<any>[] = [];
        response.headers.forEach(async (value, anyCaseKey) => {
            headers.push(`${anyCaseKey}: ${value}`);
            const key = anyCaseKey.toLowerCase();
            objects.push(new ResourceHeader(url, key, value));
            if (key === "content-type") {
                const type = value.toLowerCase();
                if (type.match(/^text\/html/))
                    objects.push(new ResourceVersion({
                        resource,
                        time,
                        type: ResourceVersionType.RAW_HTML,
                        length: bodyLength,
                    }));
            }
        });
        const headerContent = headers.join("\n");
        if (!headerContent) {
            log("header issue");
            log(JSON.stringify(headers));
        }
        const headersLength = await resource.writeVersion(time, FileFormat.RAW_HEADERS, headerContent)
        objects.push(new ResourceVersion({
            resource,
            time,
            type: ResourceVersionType.HEADERS,
            length: headersLength,
        }));

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
