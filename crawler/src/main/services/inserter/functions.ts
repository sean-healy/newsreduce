import { DBObject } from "types/DBObject";
import { Redis, REDIS_PARAMS } from "common/Redis";
import { INSERT_CACHE } from "common/events";

const BATCH_SIZE = 20000;

export async function bulkInsert() {
    const client = Redis.renewRedis(REDIS_PARAMS.inserts);
    const keys = await client.keys();
    const promises = [];
    for (const key of keys) {
        console.log(key);
        const table = DBObject.forTable(key);
        const list = await client.srandmember(key, BATCH_SIZE);
        if (list && list.length !== 0) {
            const params: any[][] = list.map(row => JSON.parse(row));
            promises.push(table.bulkInsert(params).then(() => Promise.all([
                Redis.renewRedis(REDIS_PARAMS.general).sadd(INSERT_CACHE, list),
                client.srem(key, list),
            ])));
        }
    }
    await Promise.all(promises);
}
