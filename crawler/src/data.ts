import { log } from "./common/logging";
import sql from "./sql";
import { milliTimestamp } from "./common/time";
import { db, renewRedis, REDIS_PARAMS, RedisParamsValueType } from "./common/connections";
import { thenDebug } from "./common/functional";
import { ResourceURL } from "types/objects/ResourceURL";
import { STR_ONE } from "common/util";

function genericSQLPromise<From, To>(query: string, params: any[], mapper?: (v: From) => To) {
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

export function processWikiCategories(relations: [bigint, bigint][]) {
    if (relations.length === 0) return;
    const query = sql.INSERT_WIKI_CATEGORIES_IF_ABSENT;
    const params = [relations];
    return genericSQLPromise(query, params);
}

export function deleteLegacyWikiCategories(parent: bigint, newChildren: bigint[]) {
    const query = sql.DELETE_WIKI_CATEGORIES_FOR_PARENTS;
    return genericSQLPromise(query, [parent, newChildren]);
}
export function processWikiPages(resourceIDs: bigint[]) {
    if (resourceIDs.length === 0) return;
    const query = sql.INSERT_WIKI_PAGES_IF_ABSENT;
    const params = [resourceIDs.map(id => [id])];
    return genericSQLPromise(query, params);
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
    for (const url of urls) {
        const resourceURL = new ResourceURL(url);
        if (!await resourceURL.fetchLocked())
            promises.push(new Promise((res, rej) =>
                renewRedis(REDIS_PARAMS.fetchSchedule).zincrby(resourceURL.host.name, 1, url, err =>
                    err ? rej(err) : res())));
    }

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

export async function popURL(host: string) {
    const url: string = await new Promise<any>((res, rej) =>
        renewRedis(REDIS_PARAMS.fetchSchedule).zpopmax([host, 1], (err, reply) =>
            err ? rej(err) : res(reply && reply.length !== 0 ? reply[0] : null)));
    if (url) new ResourceURL(url).fetchLock();

    return url;
}
