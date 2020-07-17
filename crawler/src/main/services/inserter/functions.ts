import { DBObject } from "types/DBObject";
import { Redis, REDIS_PARAMS } from "common/Redis";
import { IDENTITY_FUNCTION } from "common/util";
import { INSERT_CACHE } from "common/events";

const sizes = [10000, 20000];

let BATCH_SIZE = 10000;

export async function bulkInsert() {
    const client = Redis.renewRedis(REDIS_PARAMS.inserts);
    const keys = await client.keys();
    for (const key of keys) {
        console.log(key);
        const table = DBObject.forTable(key);
        let start = Date.now();
        const list = await client.srandmember(key, BATCH_SIZE);
        let end = Date.now();
        console.log(`LISTING ${(end - start)} ms`);
        if (list && list.length !== 0) {
            const params: any[][] = list.map(row => JSON.parse(row));
            start = Date.now();
            await table.bulkInsert(params);
            end = Date.now();
            console.log(`BULK INSERT ${(end - start)} ms`);
            start = Date.now();
            await Promise.all([
                Redis.renewRedis(REDIS_PARAMS.general).sadd(INSERT_CACHE, list),
                client.srem(key, list),
            ]);
            end = Date.now();
            console.log(`CLEANUP ${(end - start)} ms`);
        }
    }
}
