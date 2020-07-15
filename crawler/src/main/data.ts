import { log } from "common/logging";
import sql from "sql";
import { milliTimestamp } from "common/time";
import { db } from "common/connections";
import { thenDebug } from "common/functional";
import { ResourceURL } from "types/objects/ResourceURL";
import { STR_ONE } from "common/util";
import { Redis, REDIS_PARAMS } from "common/Redis";

function genericSQLPromise<From, To>(
    query: string,
    params: any[] = [],
    mapper?: (v: From) => To
) {
    return new Promise<To>(async (res, rej) => {
        const filledQuery =
            (await db()).query(query, params, (err, response) => {
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
        if (!await resourceURL.isFetchLocked()) {
            promises.push(Redis.renewRedis(REDIS_PARAMS.fetchSchedule)
                .zincrby(resourceURL.host.name, 1, url));
            ++scheduled;
        }
    }

    console.log(`Scheduled ${scheduled} URLs.`);

    await Promise.all(promises);
}
export function processResourceLinks(
    parentPositionChild: [bigint, number, bigint][]
) {
    const query = sql.INSERT_RESOURCE_LINK_IF_ABSENT;
    return genericSQLPromise(query, [parentPositionChild]);
}

export async function crawlAllowed(host: string) {
    return !(await Redis.renewRedis(REDIS_PARAMS.throttle).eq(host));
}

export function throttle(host: string, ms: number) {
    Redis
        .renewRedis(REDIS_PARAMS.throttle)
        .setpx(host, ms, STR_ONE)
        .catch(thenDebug);
}

type Type = { [key: string]: string }[]
const ROW_MAPPER = (rows: Type) => rows.map(row => Object.values(row)[0]);
export function selectFetchedURLs(after: number) {
    const query = sql.SELECT_FETCHED_URLS;
    const params = [after];
    return genericSQLPromise<Type, string[]>(query, params, ROW_MAPPER);
}
