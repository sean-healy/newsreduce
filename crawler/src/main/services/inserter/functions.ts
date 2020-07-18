import { DBObject } from "types/DBObject";
import { Redis, REDIS_PARAMS } from "common/Redis";
import { INSERT_CACHE } from "common/events";

const BATCH_SIZE = 5;

const KEY_LOCK = new Set<string>();

const stages = {};

function printStages() {
    const tmpStages = {};
    for (const key in stages) {
        const [value, time] = stages[key];
        tmpStages[key] = [value, Date.now() - time];
    }
    console.clear();
    console.table(tmpStages);
}

function setStage(key: string, value: string) {
    const prev = stages[key];
    if (!prev || prev[0] !== value) {
        stages[key] = [value, Date.now()];
        printStages();
    }
    else console.log("stage re-entered:", value);
}

export async function insertForKey(key: string) {
    const insertsClient = Redis.renewRedis(REDIS_PARAMS.inserts);
    const generalClient = Redis.renewRedis(REDIS_PARAMS.general)
    const table = DBObject.forTable(key);
    const list = await insertsClient.srandmember(key, BATCH_SIZE);
    setStage(key, "LISTED");
    if (list && list.length !== 0) {
        const params: any[][] = list.map(row => JSON.parse(row));
        setStage(key, `INSERTING (${params.length})`);
        await table.bulkInsert(params);
        setStage(key, "CLEANUP");
        await Promise.all([
            generalClient.sadd(INSERT_CACHE, list),
            insertsClient.srem(key, list),
        ]);
    }
    KEY_LOCK.delete(key);
    setStage(key, "UNLOCKED");
}

export async function asyncBulkInsert() {
    const insertsClient = Redis.renewRedis(REDIS_PARAMS.inserts);
    const keys = await insertsClient.keys();
    for (const key of keys) {
        if (KEY_LOCK.has(key)) continue;
        KEY_LOCK.add(key);
        setStage(key, "LOCKED");
        insertForKey(key);
    }
}

export async function bulkInsert() {
    asyncBulkInsert();
}
