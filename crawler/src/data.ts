import { parseURL, generateURL } from "./common/url";
import { log } from "./common/logging";
import sql from "./sql";
import { defaultHash } from "./common/hashing";
import { milliTimestamp } from "./common/time";
import { ResourceExtra } from "./types/ResourceExtra";
import { db, renewRedis, REDIS_PARAMS } from "./common/connections";
import { getUrlID, getHostID } from "./common/ids";
import { thenDebug } from "./common/functional";
const PREFIX = Buffer.from([0]);

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

const HEAD = <H>([head,]: [H, any?, any?]) => head;

export function processHost(name: string, throttle: number) {
    const { id, idBytes } = getHostID(name);
    const query = sql.INSERT_HOSTS_IF_ABSENT;
    const params = [id, name, throttle];
    const promise = genericSQLPromise(query, [[params]]);

    return { promise, id, idBytes };
}
export function processHosts(names: string[], throttle: number) {
    const idBytes = names.map(name => defaultHash("host", name));
    const ids = idBytes.map(bytes => bytes.readBigUInt64BE());
    const query = sql.INSERT_HOSTS_IF_ABSENT;
    const params = names.map((name, i) => [ids[i], name, throttle]);
    const promise = genericSQLPromise(query, [params]);

    return { promise, ids, idBytes };
}
export function processURL(url: string, clientID: number, refererID: bigint) {
    const resource = parseURL(url);
    if (!resource) return null;
    const { id, idBytes } = getUrlID(url);
    refererID = refererID ? refererID : id;
    const { ssl, host, port, path, query } = resource;
    const { promise: hostPromise, id: hostID } = processHost(host, 1000);
    const sqlQuery = sql.INSERT_RESOURCE_URLS_IF_ABSENT;
    const params = [id, ssl, hostID, port, path, query, refererID, clientID]
    const resourcePromise = genericSQLPromise(sqlQuery, [[params]]);
    const promise = Promise.all([resourcePromise, hostPromise]).then(HEAD);

    return { promise, id, idBytes };
}
export function processURLs(urls: string[]) {
    const resources = urls.map(parseURL);
    const idsAndBytes = urls.map(getUrlID);
    const ids = idsAndBytes.map(item => item.id);
    const idBytes = idsAndBytes.map(item => item.idBytes);
    const hosts = resources.map(resource => resource.host);
    const { promise: hostPromise, ids: hostIDs } = processHosts(hosts, 1000);
    const sqlQuery = sql.INSERT_RESOURCE_URLS_IF_ABSENT;
    const params = resources.map(({ ssl, port, path, query }, i) => [ids[i], ssl, hostIDs[i], port, path, query]);
    const resourcePromise = genericSQLPromise(sqlQuery, [params]);
    const promise = Promise.all([resourcePromise, hostPromise]).then(HEAD);

    return { promise, ids, idBytes };
}

export function processClient(name: string, httpVersion: string) {
    const idBytes = defaultHash("client", name);
    const id = idBytes.readUInt16BE();
    const query = sql.INSERT_CLIENT_IF_ABSENT
    const params = [id, name, httpVersion];
    const promise = genericSQLPromise(query, [[params]]);

    return { promise, id, idBytes };
}
export function processClientHeader(clientID: number, name: string, value: string) {
    const { promise: headerPromise, id, idBytes } = processHTTPHeader(name, value);
    const query = sql.INSERT_CLIENT_HEADER_IF_ABSENT;
    const params = [clientID, id];
    const clientHeaderPromise = genericSQLPromise(query, [[params]]);
    const promise = Promise.all([clientHeaderPromise, headerPromise]).then(HEAD);

    return { promise, id, idBytes };
}

export function processResourceHeader(resourceID: bigint, name: string, value: string) {
    const { promise: headerPromise, id, idBytes } = processHTTPHeader(name, value);
    const query = sql.INSERT_RESOURCE_HEADER_IF_ABSENT;
    const params = [resourceID, id];
    const resourceHeaderPromise = genericSQLPromise(query, [[params]]);
    const promise = Promise.all([resourceHeaderPromise, headerPromise]).then(HEAD);

    return { promise, id, idBytes };
}
export function processResourceHeaders(resourceID: bigint, nameAndValues: [string, string][]) {
    const { promise: headerPromise, ids, idBytes } = processHTTPHeaders(nameAndValues);
    const query = sql.INSERT_RESOURCE_HEADER_IF_ABSENT;
    const params = ids.map(id => [resourceID, id]);
    const resourceHeaderPromise = genericSQLPromise(query, [params]);
    const promise = Promise.all([resourceHeaderPromise, headerPromise]).then(HEAD);

    return { promise, ids, idBytes };
}

export function processHTTPHeader(name: string, value: string) {
    const { promise: namePromise, id: nameID, idBytes: nameHash } = processHTTPHeaderName(name);
    const { promise: valuePromise, id: valueID, idBytes: valueHash } = processHTTPHeaderValue(value);
    const idBytes = Buffer.concat([nameHash, valueHash]).slice(0, 8);
    const id = idBytes.readBigUInt64BE();
    const params = [id, nameID, valueID];
    const query = sql.INSERT_HTTP_HEADER_IF_ABSENT;
    const headerPromise = genericSQLPromise(query, [[params]]);
    const promise = Promise.all([headerPromise, namePromise, valuePromise]).then(HEAD);

    return { promise, id, idBytes };
}
export function processHTTPHeaders(nameAndValus: [string, string][]) {
    const { idBytes: nameHashes, ids: nameIDs, promise: namesPromise } = processHTTPHeaderNames(nameAndValus.map(item => item[0]));
    const { idBytes: valueHashes, ids: valueIDs, promise: valuesPromise } = processHTTPHeaderValues(nameAndValus.map(item => item[1]));
    const idBytes = nameHashes.map((nameHash, i) => Buffer.concat([nameHash, valueHashes[i]]).slice(0, 8))
    const ids = idBytes.map(bytes => bytes.readBigUInt64BE());
    const params = ids.map((id, i) => [id, nameIDs[i], valueIDs[i]]);
    const query = sql.INSERT_HTTP_HEADER_IF_ABSENT;
    const headerPromise = genericSQLPromise(query, [params]);
    const promise = Promise.all([headerPromise, namesPromise, valuesPromise]).then(HEAD);

    return { promise, ids, idBytes };
}

export function processHTTPHeaderNames(names: string[]) {
    const idBytes = names.map(name => defaultHash("http-header-name", name));
    const ids = idBytes.map(bytes => Buffer.concat([PREFIX, bytes]).readUInt32BE());
    const query = sql.INSERT_HTTP_HEADER_NAMES_IF_ABSENT;
    const params = ids.map((id, i) => [id, names[i]]);
    const promise = genericSQLPromise(query, [params]);

    return { promise, ids, idBytes };
}
export function processHTTPHeaderName(name: string) {
    const idBytes = defaultHash("http-header-name", name);
    const id = Buffer.concat([PREFIX, idBytes]).readUInt32BE();
    const query = sql.INSERT_HTTP_HEADER_NAMES_IF_ABSENT;
    const params = [id, name];
    const promise = genericSQLPromise(query, [[params]]);

    return { promise, id, idBytes };
}

export function httpHeaderValueID(value: string) {
    const idBytes = defaultHash("http-header-value", value);
    const id = idBytes.readBigUInt64BE();

    return { id, idBytes };
}
export function processHTTPHeaderValue(value: string) {
    const { id, idBytes } = httpHeaderValueID(value);
    const query = sql.INSERT_HTTP_HEADER_VALUES_IF_ABSENT;
    const params = [id, value];
    const promise = genericSQLPromise(query, [[params]]);

    return { promise, id, idBytes };
}
export function processHTTPHeaderValues(values: string[]) {
    const idBytes = values.map(value => httpHeaderValueID(value).idBytes);
    const ids = idBytes.map(bytes => bytes.readBigUInt64BE());
    const query = sql.INSERT_HTTP_HEADER_VALUES_IF_ABSENT;
    const params = ids.map((id, i) => [id, values[i]]);
    const promise = genericSQLPromise(query, [params]);

    return { promise, ids, idBytes };
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

export function selectPostSchedule() {
    return new Promise<ResourceExtra[]>(async (resolve, reject) => {
        const query = sql.SELECT_PRIORITY_RESOURCE_PER_HOST;
        (await db()).query(query, (err, rows: ResourceExtra[]) => {
            if (err) reject(err);
            else resolve(rows)
        });
    });
}
export function selectResource(resourceID: bigint) {
    return new Promise<ResourceExtra>(async (res, rej) => {
        const query = sql.SELECT_RESOURCE;
        (await db()).query(query, [resourceID], (err, rows: ResourceExtra[]) => {
            if (err) rej(err);
            else res(rows[0])
        });
    });
}
export function selectPreSchedule() {
    const time = milliTimestamp();
    return genericSQLPromise(sql.SELECT_RESOURCES_NOT_SCHEDULED_RECENTLY, [time, time], (rows: any[]) => rows.map(generateURL));
}
export function deleteSchedule(resourceID: bigint) {
    return genericSQLPromise(sql.DELETE_SCHEDULE, [resourceID]);
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
interface HTMLToProcess extends ResourceExtra {
    hostname: string;
    file: bigint;
    fetchedByClient: number;
}
export function selectWikisToProcess() {
    return new Promise<HTMLToProcess[]>(async (resolve, reject) => {
        (await db()).query(sql.SELECT_WIKI_HTML_FILES_TO_PROCESS, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}
export function processWikiProcessed(resourceID: bigint) {
    return new Promise(async (resolve, reject) => {
        (await db()).query(sql.INSERT_PROCESSED_WIKIS_IF_ABSENT, [[[resourceID]]], err => {
            if (err) reject(err);
            else resolve();
        });
    });
}
export function selectHTMLToProcess() {
    return new Promise<HTMLToProcess[]>(async (resolve, reject) => {
        (await db()).query(sql.SELECT_HTML_RESOURCE_AND_FILE_TO_PROCESS, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}
export function processResourceLinks(parentPositionChild: [bigint, number, bigint][]) {
    const query = sql.INSERT_RESOURCE_LINK_IF_ABSENT;
    return genericSQLPromise(query, [parentPositionChild]);
}
export function selectThrottles(hosts: (bigint | string)[]) {
    switch (typeof hosts[0]) {
        case "string": return selectThrottleByHostnames(hosts as any);
        case "bigint": return selectThrottleByHostIDs(hosts as any);
    }
}
function selectThrottleByHostIDs(hosts: bigint[]) {
    return genericSQLPromise(sql.SELECT_THROTTLE_FOR_HOST, [[hosts]], (rows: any) => {
        const throttles = new Map<bigint, number>();
        console.log(rows);
        rows.forEach((row: any) => throttles.set(BigInt(row.id), row.throttle));

        return throttles;
    });
}

function selectThrottleByHostnames(hosts: string[]) {
    return selectThrottleByHostIDs(hosts.map(host => getHostID(host).id));
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
