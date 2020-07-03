import fetch, { Response } from "node-fetch";
import {
    deleteLegacyHeaders,
    processFetchedResource,
    processResourceHeaders,
    httpHeaderValueID,
    selectThrottles,
    crawlAllowed,
    throttle,
    popURL,
    getRedisKeys,
} from "../../data";
import {
    write,
} from "../../file";
import { db } from "../../common/connections";
import { FETCHER_BIRTH_LOG, SCHEDULE_COMPLETE, FETCH_COMPLETE, FETCHER_DEATH_LOG } from "../../common/events";
import { errRollback, errRollbackInner } from "../../common/transaction";
import { FileFormat } from "../../types/FileFormat";
import { Entity } from "../../types/Entity";
import { getHostID, getUrlID } from "../../common/ids";
import { start } from "../../common/worker";

function buildOnFetch(url: string, start: number) {
    return async (response: Response) => {
        const id = getUrlID(url).id;
        const dataPromises = [];
        let type: bigint;
        let length: number;
        const resourceHeaders: [string, string][] = [];
        const fileWritePromise = write(Entity.RESOURCE, id, start, FileFormat.RAW_HTML, response.body).then(length => ({
            duration: Date.now() - start,
            length
        }));
        dataPromises.push(fileWritePromise);
        (await db()).beginTransaction(async () => {
            response.headers.forEach(async (value, anyCaseKey) => {
                const key = anyCaseKey.toLowerCase();
                resourceHeaders.push([key, value]);
                switch (key) {
                    case "content-type":
                        type = httpHeaderValueID(value).id;
                        break;
                    case "content-length":
                        length = Number(value);
                        break;
                }
            });
            const { ids: nextHeaderIDs, promise } = processResourceHeaders(id, resourceHeaders);
            dataPromises.push(promise);
            dataPromises.push(fileWritePromise);
            dataPromises.push(deleteLegacyHeaders(id, nextHeaderIDs));
            const metadataPromises = [];
            Promise.all(dataPromises).then(([{ duration, length: actualLength },]) => {
                if (!length) length = actualLength;
                metadataPromises.push(processFetchedResource({ id, duration, status: response.status, length, type }));
                Promise.all(metadataPromises)
                    .then(async () => (await db()).commit(errRollback))
                    .catch(err => errRollbackInner(err))
            });
        });
    };
}

async function pollAndFetch(lo: () => bigint, hi: () => bigint) {
    let hosts: string[];
    do {
        hosts = await getRedisKeys("fetchSchedule");
        console.log("Got hosts from redis:", JSON.stringify(hosts));
        const throttles = (await selectThrottles(hosts));
        console.log("Throttles for hosts", JSON.stringify(throttles));
        for (const host of hosts) {
            const id = getHostID(host).id;
            if (id >= lo() && id < hi()) {
                console.log(`Host within range (${lo()} --> ${hi()}: ${host}`);
                if (await crawlAllowed(host)) {
                    const url = await popURL(host);
                    if (url) {
                        console.log(url);
                        throttle(host, throttles.get(id));
                        const start = Date.now();
                        await fetch(url).then(buildOnFetch(url, start));
                    }
                }
            };
        }
    } while (hosts.length !== 0);
}

start(pollAndFetch, FETCHER_BIRTH_LOG, FETCHER_DEATH_LOG, new Set(SCHEDULE_COMPLETE), FETCH_COMPLETE);
