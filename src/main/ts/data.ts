import sql from "sql";
import { ResourceURL } from "types/db-objects/ResourceURL";
import { fancyLog } from "common/util";
import { Redis, REDIS_PARAMS } from "common/Redis";
import { SQL } from "common/SQL";

async function genericSQLPromise<From = { [key: string]: any }[], To = { [key: string]: any }[]>(
    query: string,
    params: any[] = [],
    mapper?: (v: From) => To
): Promise<To> {
    let response: From | To = await SQL.query<From>(query, params);
    if (mapper && response) response = mapper(response);
    return response as To;
}

type Schedule = { id: bigint, url: string };
export function selectPreSchedule() {
    return genericSQLPromise<any, Schedule[]>(sql.SELECT_RESOURCES_TO_FETCH);
}
export async function schedule(items: Schedule[]) {
    fancyLog(`Attempting to schedule ${items.length} URLs.`);
    const promises = [];
    let scheduled = 0;
    for (const item of items) {
        const resourceURL = new ResourceURL(item.url);
        if (!await resourceURL.isFetchLocked()) {
            promises.push(Redis.renewRedis(REDIS_PARAMS.fetchSchedule)
                .zincrby(resourceURL.host.name, 1, item.url));
            ++scheduled;
        }
    }
    if (scheduled) fancyLog(`Scheduled ${scheduled} URLs.`);

    await Promise.all(promises);
}

export async function selectResourceVersions() {
    const query = sql.SELECT_RESOURCE_VERSIONS;
    const rows = await genericSQLPromise(query);
    const resources: { [key: string]: Map<number, Set<string>> } = {};
    for (const row of rows) {
        const url: string = row.url;
        const time: number = row.time;
        const filename: string = row.filename;
        let times: Map<number, Set<string>>;
        if (url in resources)
            times = resources[url];
        else {
            times = new Map();
            resources[url] = times;
        }
        let formats: Set<string>;
        if (times.has(time)) {
            formats = times.get(time);
        } else {
            formats = new Set();
            times.set(time, formats);
        }
        formats.add(filename);
    }

    return resources;
}

export async function selectBagOfWordsByHost() {
    const query = sql.SELECT_BAG_OF_WORDS_RESOURCE_HOST_PAIRS;
    const rows = await genericSQLPromise(query);
    const hosts = new Map<bigint, [bigint, number][]>();
    for (const row of rows) {
        const resource: bigint = BigInt(row.resource);
        const time: number = row.time;
        const host = row.host;
        const version: [bigint, number] = [resource, time];
        if (hosts.has(host)) hosts.get(host).push(version);
        else hosts.set(host, [version]);
    }

    return hosts;
}

export async function selectBacklinks() {
    const query = sql.SELECT_BACKLINKS;
    const rows = await genericSQLPromise(query);
    
    return rows.map(({parent, child}) => [BigInt(parent), BigInt(child)]);
}

export async function selectBOWsForRelation(relation: bigint, polarity: boolean) {
    const rows = await genericSQLPromise(sql.SELECT_BOW_FOR_RELATION, [relation, polarity]);
    return rows.map(({resource, time}) => [BigInt(resource), time]);
}