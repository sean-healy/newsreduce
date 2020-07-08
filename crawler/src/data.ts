import { parseURL, generateURL } from "./common/url";
import { log } from "./common/logging";
import sql from "./sql";
import { milliTimestamp } from "./common/time";
import { db, renewRedis, REDIS_PARAMS } from "./common/connections";
import { thenDebug } from "./common/functional";

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

export function selectHeadersForResource(resourceID: bigint) {
    return new Promise<bigint[]>(async (resolve, reject) => {
        (await db()).query(sql.SELECT_HEADERS_FOR_RESOURCE, [resourceID], (err, rows) => {
            if (err) reject(err);
            resolve(rows.map((row: any) => BigInt(row.header)));
        });
    });
}

export function deleteLegacyHeaders(resourceID: bigint, currentHeaders: bigint[]) {
    const query = sql.DELETE_RESOURCE_HEADERS;
    const params = [resourceID, [currentHeaders]];
    return genericSQLPromise(query, params);
}

export function selectPreSchedule() {
    const time = milliTimestamp();
    return genericSQLPromise(sql.SELECT_RESOURCES_NOT_SCHEDULED_RECENTLY, [time, time], (rows: any[]) => rows.map(generateURL));
}
export function selectTables() {
    return new Promise<string[]>(async (resolve, reject) => {
        const query = sql.SELECT_TABLES;
        (await db()).query(query, (err, rows: { name: string }[]) => {
            if (err) reject(err);
            else resolve(rows.map(row => row.name))
        });
    });
}
export function truncateTable(table: string) {
    return new Promise(async (resolve, reject) => {
        const query = `truncate table ${table}`;
        (await db()).query(query, [table], err => {
            if (err) reject(err);
            else resolve(null);
        });
    });
}
export function truncateAllTables() {
    return new Promise((resolve, reject) => {
        selectTables().then(tables => {
            const promises = [];
            for (const table of tables)
                promises.push(truncateTable(table));
            Promise.all(promises).then(resolve).catch(reject)
        });
    });
}
export function truncateTables(tables: string[]) {
    const promises = [];
    for (const table of tables)
        promises.push(truncateTable(table));
    return Promise.all(promises);
}
export function schedule(urls: string[]) {
    const promises = [];
    for (const url of urls) {
        promises.push(new Promise((res, rej) => {
            const host = parseURL(url).host
            renewRedis("fetchSchedule").zincrby(host, 1, url, err => {
                if (err) rej(err);
                else res()
            });
        }));
    }

    return Promise.all(promises);
}
export function processResourceLinks(parentPositionChild: [bigint, number, bigint][]) {
    const query = sql.INSERT_RESOURCE_LINK_IF_ABSENT;
    return genericSQLPromise(query, [parentPositionChild]);
}

const WILDCARD = "*";
export async function getRedisKeys(redis: keyof typeof REDIS_PARAMS) {
    return await new Promise<string[]>((res, rej) => renewRedis(redis).keys(WILDCARD, (err, keys) => {
        if (err) {
            console.debug(err);
            rej(err);
        } else res(keys);
    }));
}

const ONE = "1";
export async function crawlAllowed(host: string) {
    const reply = await new Promise<string>((res, rej) => renewRedis("throttle").get(host, (err, value) => err ? rej() : res(value)));

    return reply !== ONE;
}

export function throttle(host: string, ms: number) {
    renewRedis("throttle").set(host, ONE, "PX", ms, thenDebug);
}

export async function popURL(host: string) {
    return await new Promise<any>((res, rej) => renewRedis("fetchSchedule").zpopmax([host, 1], (err, reply) => {
        if (err) {
            console.debug(err);
            rej(err);
        } else if (reply && reply.length !== 0)
            res(reply[0]);
        else
            res(null);
    }));
}
