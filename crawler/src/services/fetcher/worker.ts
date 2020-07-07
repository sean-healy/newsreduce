import fetch, { Response } from "node-fetch";
import {
    deleteLegacyHeaders,
    processResourceHeaders,
    crawlAllowed,
    throttle,
    popURL,
    getRedisKeys,
} from "../../data";
import {
    write,
} from "../../file";
import { db, renewRedis } from "../../common/connections";
import { FETCHER_BIRTH_LOG, SCHEDULE_COMPLETE, FETCH_COMPLETE, FETCHER_DEATH_LOG } from "../../common/events";
import { errRollback, errRollbackInner } from "../../common/transaction";
import { FileFormat } from "../../types/FileFormat";
import { Entity } from "../../types/Entity";
import { start } from "../../common/worker";
import { log } from "../../common/logging";
import { FetchedResource } from "../../types/objects/FetchedResource";
import { ResourceURL } from "../../types/objects/ResourceURL";
import { milliTimestamp } from "../../common/time";
import { Host } from "../../types/objects/Host";
import { ResourceHeader } from "../../types/objects/ResourceHeader";

function buildOnFetch(url: string) {
    return async (response: Response) => {
        const resourceURL = new ResourceURL(url);
        const dataPromises = [];
        let type: string;
        let length: number;
        const fileWritePromise = write(
            Entity.RESOURCE, resourceURL.getID(), milliTimestamp(), FileFormat.RAW_HTML, response.body
        );
        dataPromises.push(fileWritePromise);
        (await db()).beginTransaction(async () => {
            const legacyRetains = [];
            response.headers.forEach(async (value, anyCaseKey) => {
                const key = anyCaseKey.toLowerCase();
                const resourceHeader = new ResourceHeader(url, key, value)
                legacyRetains.push(resourceHeader.header);
                resourceHeader.enqueueDeepInsert();
                if (key === "content-type") type = value.toLowerCase();
                else if (key === "content-length") length = Number(value);
            });
            renewRedis("legacyRetains").hset(new ResourceHeader().table(), url, JSON.stringify(legacyRetains));
            const metadataPromises = [];
            Promise.all(dataPromises).then(([actualLength,]) => {
                if (!length) length = actualLength;
                new FetchedResource(url, length, type)
                Promise.all(metadataPromises)
                    .then(async () => (await db()).commit(errRollback))
                    .catch(err => errRollbackInner(err))
            });
        });
    };
}

async function pollAndFetch(lo: () => bigint, hi: () => bigint) {
    let hostnames: string[];
    do {
        hostnames = await getRedisKeys("fetchSchedule");
        log("Got hosts from redis:", JSON.stringify(hostnames));
        const hostIDs = hostnames.map(hostname => new Host({ name: hostname }).getID());
        const throttleList = (await new Host().bulkSelect(hostIDs, ["name", "throttle"]));
        const throttles = {};
        for (const row of throttleList) throttles[row.name] = row.throttle;
        log("Throttles for hosts", JSON.stringify(throttles));
        for (const hostname of hostnames) {
            const host = new Host({ name: hostname });
            const id = host.getID();
            if (id >= lo() && id < hi()) {
                log(`Host within range (${lo()} --> ${hi()}: ${host}`);
                if (await crawlAllowed(hostname)) {
                    const url = await popURL(hostname);
                    if (url) {
                        console.log(url);
                        throttle(hostname, throttles[hostname]);
                        await fetch(url).then(buildOnFetch(url));
                    }
                }
            };
        }
    } while (hostnames.length !== 0);
}

start(pollAndFetch, FETCHER_BIRTH_LOG, FETCHER_DEATH_LOG, new Set(SCHEDULE_COMPLETE), FETCH_COMPLETE);
