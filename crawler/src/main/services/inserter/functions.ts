import { DBObject } from "types/DBObject";
import { Redis, REDIS_PARAMS } from "common/Redis";
import { IDENTITY_FUNCTION } from "common/util";
import { INSERT_CACHE } from "common/events";

const sizes = [5, 10, 20, 50, 100, 200, 500, 1000, 2000, 5000];

let BATCH_SIZE = 100;

const CHANGE = false;

export async function bulkInsert() {
    const client = Redis.renewRedis(REDIS_PARAMS.inserts);
    const keys = await client.keys();
    for (const key of keys) {
        //console.log(key);
        const typePromise = client.type(key);
        const table = DBObject.forTable(key);
        if (!CHANGE) {
            let deleteFn: typeof client.srem;
            let listFn: typeof client.smembers;
            let preMapper: (response: any) => string[];
            let postMapper: (row: string, response: any) => string;
            let useInsertedCache: boolean;
            await typePromise.then(async type => {
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
                    let start = Date.now();
                    const list = await listFn.bind(client)(key);
                    let end = Date.now();
                    //console.log(`LISTING ${(end - start)} ms`);
                    const toRemove = preMapper(list).slice(0, BATCH_SIZE);
                    const params: any[][] = toRemove.map(row =>
                        JSON.parse(postMapper(row, list)));
                    //console.log("MAPPED");
                    res([params, toRemove]);
                });
                let start = Date.now();
                await table.bulkInsert(params);
                let end = Date.now();
                //console.log(`BULK INSERT ${(end - start)} ms`);
                console.log(params.length, end - start);
                start = Date.now();
                if (useInsertedCache)
                    await Promise.all([
                        Redis.renewRedis(REDIS_PARAMS.general).sadd(INSERT_CACHE, toRemove),
                        deleteFn.bind(client)(key, toRemove),
                    ]);
                else
                    await deleteFn.bind(client)(key, toRemove);
                end = Date.now();
                //console.log(`CLEANUP ${(end - start)} ms`);
                BATCH_SIZE = sizes[Math.floor(Math.random() * sizes.length)];
            });
        } else {
            const list = await client.srandmember(key, BATCH_SIZE);
            const params: any[][] = list.map(row => JSON.parse(row));
            await table.bulkInsert(params);
            await Promise.all([
                Redis.renewRedis(REDIS_PARAMS.general).sadd(INSERT_CACHE, list),
                client.srem(key, list),
            ]);
        }
    }
}
