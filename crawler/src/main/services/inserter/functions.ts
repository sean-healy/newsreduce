import { DBObject } from "types/DBObject";
import { Redis, REDIS_PARAMS } from "common/Redis";
import { IDENTITY_FUNCTION } from "common/util";
import { INSERT_CACHE } from "common/events";

const BATCH_SIZE = 5000;

export async function bulkInsert() {
    const client = Redis.renewRedis(REDIS_PARAMS.inserts);
    const keys = await client.keys();
    let start = Date.now();
    const promises = new Array<Promise<void>>(keys.length);
    for (const key of keys) {
        console.log(key);
        const typePromise = client.type(key);
        const table = DBObject.forTable(key);
        let deleteFn: typeof client.srem;
        let listFn: typeof client.smembers;
        let preMapper: (response: any) => string[];
        let postMapper: (row: string, response: any) => string;
        let useInsertedCache: boolean;
        promises.push(typePromise.then(async type => {
            [listFn, preMapper, postMapper, deleteFn, useInsertedCache] = {
                hash: [
                    client.hgetall,
                    Object.keys,
                    (row: string, response: any) => response[row],
                    client.hdel,
                    true
                ],
                set: [
                    (key: string) => client.srandmember(key, BATCH_SIZE),
                    IDENTITY_FUNCTION,
                    (row: string, _: any) => row,
                    client.srem,
                    false
                ]
            }[type];
            const [params, toRemove] = await new Promise(async res => {
                const list = await listFn.bind(client)(key);
                const toRemove = preMapper(list).slice(0, BATCH_SIZE);
                const params: any[][] = toRemove.map(row =>
                    JSON.parse(postMapper(row, list)));
                res([params, toRemove]);
            });
            await table.bulkInsert(params);
            await deleteFn.bind(client)(key, toRemove);
            if (useInsertedCache)
                await Promise.all([
                    Redis.renewRedis(REDIS_PARAMS.general).sadd(INSERT_CACHE, toRemove),
                    deleteFn.bind(client)(key, toRemove),
                ]);
            else
                await deleteFn.bind(client)(key, toRemove);
        }));
    }
    await Promise.all(promises);
    let end = Date.now();
    console.log(`${(end - start)} ms`);
}
