import { DBObject } from "types/DBObject";
import { Redis, REDIS_PARAMS } from "common/Redis";
import { INSERT_CACHE } from "common/events";

const BATCH_SIZE = 20000;

const KEY_LOCK = new Set<string>();

export async function bulkInsert() {
    const insertsClient = Redis.renewRedis(REDIS_PARAMS.inserts);
    const generalClient = Redis.renewRedis(REDIS_PARAMS.general)
    const keys = await insertsClient.keys();
    for (const key of keys) {
        if (KEY_LOCK.has(key)) continue;
        KEY_LOCK.add(key);
        console.log(key);
        const table = DBObject.forTable(key);
        const list = await insertsClient.srandmember(key, BATCH_SIZE);
        if (list && list.length !== 0) {
            const params: any[][] = list.map(row => JSON.parse(row));
            table.bulkInsert(params)
                .then(() => Promise.all([
                    generalClient.sadd(INSERT_CACHE, list),
                    insertsClient.srem(key, list),
                ]))
                .then(() => {
                    KEY_LOCK.delete(key);
                });
        }
    }
    console.log("Returning.");
}
