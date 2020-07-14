import { log } from "common/logging";
import sql from "sql";
import { milliTimestamp } from "common/time";
import { db, renewRedis, REDIS_PARAMS, RedisParamsValueType } from "common/connections";
import { thenDebug } from "common/functional";
import { ResourceURL } from "types/objects/ResourceURL";
import { STR_ONE } from "common/util";

function genericSQLPromise<From, To>(query: string, params: any[] = [], mapper?: (v: From) => To) {
    return new Promise<To>(async (res, rej) => {
        const filledQuery = (await db()).query(query, params, (err, response) => {
            if (err) {
                console.debug(err);
                rej(err);
            } else {
                if (mapper) res(mapper(response));
                else res(response);
            }
        });
        log(filledQuery.sql);
    });
}

export function selectPreSchedule() {
    const time = milliTimestamp();
    const query = sql.SELECT_RESOURCES_NOT_SCHEDULED_RECENTLY;

    const params = [time, time];
    return genericSQLPromise(query, params, (rows: any[]) =>
        rows.map(row => new ResourceURL(row).toURL()));
}
export async function schedule(urls: string[]) {
    const promises = [];
    let scheduled = 0;
    for (const url of urls) {
        const resourceURL = new ResourceURL(url);
        if (!await resourceURL.fetchLocked()) {
            promises.push(new Promise((res, rej) =>
                renewRedis(REDIS_PARAMS.fetchSchedule).zincrby(resourceURL.host.name, 1, url, err =>
                    err ? rej(err) : res())));
            ++scheduled;
        }
    }

    console.log(`Scheduled ${scheduled} URLs.`);

    await Promise.all(promises);
}
export function processResourceLinks(parentPositionChild: [bigint, number, bigint][]) {
    const query = sql.INSERT_RESOURCE_LINK_IF_ABSENT;
    return genericSQLPromise(query, [parentPositionChild]);
}

const WILDCARD = "*";
export function getRedisKeys(redis: RedisParamsValueType | string) {
    return new Promise<string[]>((res, rej) =>
        renewRedis(redis).keys(WILDCARD, (err, keys) => err ? rej(err) : res(keys)));
}

export async function crawlAllowed(host: string) {
    const reply = await new Promise<string>((res, rej) =>
        renewRedis(REDIS_PARAMS.throttle).get(host, (err, value) => err ? rej() : res(value)));

    return reply !== STR_ONE;
}

export function throttle(host: string, ms: number) {
    renewRedis(REDIS_PARAMS.throttle).set(host, STR_ONE, "PX", ms, thenDebug);
}

export function selectFetchedURLs(after: number) {
    return genericSQLPromise<{ [key: string]: string }[], string[]>(sql.SELECT_FETCHED_URLS, [after], rows => rows.map(row => Object.values(row)[0]));
}
