import sql from "sql";
import { thenDebug } from "common/functional";
import { ResourceURL } from "types/objects/ResourceURL";
import { STR_ONE, fancyLog } from "common/util";
import { Redis, REDIS_PARAMS } from "common/Redis";
import { SQL } from "common/SQL";

async function genericSQLPromise<From, To>(
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

export async function crawlAllowed(host: string) {
    return !(await Redis.renewRedis(REDIS_PARAMS.throttle).eq(host));
}

export async function selectResourcesNotProcessed() {
    const query = sql.SELECT_RESOURCES_NOT_PROCESSED;
    return genericSQLPromise<{ [key: string]: any }[], { [key: string]: any }[]>(query);
}

export function throttle(host: string, ms: number) {
    Redis
        .renewRedis(REDIS_PARAMS.throttle)
        .setpx(host, ms, STR_ONE)
        .catch(thenDebug);
}
