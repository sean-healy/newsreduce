import fetch, { Response } from "node-fetch";
import { log } from "common/logging";
import { ResourceURL } from "types/db-objects/ResourceURL";
import { milliTimestamp } from "common/time";
import { Host } from "types/db-objects/Host";
import { ResourceHeader } from "types/db-objects/ResourceHeader";
import { Redis, REDIS_PARAMS } from "common/Redis";
import { fancyLog } from "utils/alpha";
import { VersionType } from "types/db-objects/VersionType";
import { DBObject } from "types/DBObject";
import { ResourceBlocked } from "types/db-objects/ResourceBlocked";
import { GLOBAL_VARS } from "common/processor";
import { checkin, lastProcessing } from "./worker";

export function buildOnFetch(url: string) {
    return async (response: Response) => {
        const resource = new ResourceURL(url);
        const time = milliTimestamp();
        let headers = [];
        let objects: DBObject<any>[] = [];
        await new Promise<void>(res => {
            let typeSeen = false;
            response.headers.forEach((value, anyCaseKey) => {
                headers.push(`${anyCaseKey}: ${value}`);
                const key = anyCaseKey.toLowerCase();
                objects.push(new ResourceHeader(url, key, value));
                if (key === "content-type") {
                    const mimeType = value.toLowerCase();
                    let type: VersionType = null;
                    if (mimeType.match(/^text\/html/i))
                        type = VersionType.RAW_HTML;
                    else if (mimeType.match(/^application\/zip/i))
                        type = VersionType.RAW_ZIP;
                    if (type !== null) {
                        typeSeen = true;
                        console.log("Writing to file.");
                        resource.writeVersion(time, type, response.body)
                            .then(bytes => {
                                console.log(bytes, "bytes written.");
                                res();
                            });
                    }
                }
            });
            if (!typeSeen) res();
        })
        const headerContent = headers.join("\n");
        if (!headerContent) {
            log("header issue");
            log(JSON.stringify(headers));
        }
        await resource.writeVersion(time, VersionType.RAW_HEADERS, headerContent)
        try {
            await Promise.all(objects.map(obj => obj.enqueueInsert({ recursive: true })));
        } catch (e) {
            fancyLog("Error while enqueing objects");
            fancyLog(JSON.stringify(e));
        }
    };
}

export async function fetchAndWrite(url: string) {
    try {
        checkin[0] = Date.now();
        const response = await fetch(url, {
            timeout: 5000,
        });
        lastProcessing[0] = url;
        await buildOnFetch(url)(response);
    } catch (e) {
        fancyLog("Caught error during fetch.");
        fancyLog(JSON.stringify(e));
        new ResourceBlocked({
            resource: new ResourceURL(url),
            // Block the URL for 24 hours.
            expires: Date.now() + 1000 * 3600,
        }).enqueueInsert();
    }
}

export async function pollAndFetch(lo: () => bigint, hi: () => bigint) {
    let hostnames: string[];
    let fetched = new Set<string>();
    do {
        checkin[0] = Date.now();
        hostnames = await Redis.renewRedis(REDIS_PARAMS.fetchSchedule).keys();
        const hostIDs = hostnames.map(hostname => new Host({ name: hostname }).getID());
        const throttleList = (await new Host().bulkSelect(hostIDs, ["name", "throttle"]));
        const throttles: { [key: string]: number } = {};
        for (const row of throttleList) throttles[row.name] = Number(row.throttle);
        for (const hostname of hostnames) {
            checkin[0] = Date.now();
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
                        fancyLog(`Fetching: ${url}.`);
                        await fetchAndWrite(url);
                        fancyLog(`Fetched: ${url}.`);
                        fetched.add(url);
                        if (GLOBAL_VARS.safelyExit) break;
                    }
                }
            };
        }
        if (GLOBAL_VARS.safelyExit) break;
    } while (hostnames.length !== 0);

    return fetched;
}
