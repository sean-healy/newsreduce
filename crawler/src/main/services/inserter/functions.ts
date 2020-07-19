import fs from "fs";
import path from "path";
import crypto from "crypto";
import { DBObject } from "types/DBObject";
import { Redis, REDIS_PARAMS } from "common/Redis";
import { SQL } from "common/SQL";
import { INSERT_CACHE } from "common/events";

const BATCH_SIZE = 5000;

const KEY_LOCK = new Set<string>();

const stages: { [key: string]: [string, number] } = {};

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

function randomTmpFile() {
    const basename = crypto.randomBytes(30).toString("hex");
    return path.join("/tmp", basename);
}

const NEW_SADD_FEATURE = false;

export async function insertForKey(key: string) {
    const loadFile: string = randomTmpFile();
    const table = DBObject.forTable(key);
    try {
        const insertsClient = Redis.renewRedis(REDIS_PARAMS.inserts);
        const generalClient = Redis.renewRedis(REDIS_PARAMS.general)
        let list = await insertsClient.srandmember(key, BATCH_SIZE);
        setStage(key, "LISTED");
        if (list && list.length !== 0) {
            if (!NEW_SADD_FEATURE)
                list = list.map(row => row.charAt(0) === "[" ? SQL.csvRow(JSON.parse(row)) : row);
            setStage(key, `INSERTING (${list.length})`);
            fs.writeFileSync(loadFile, list.join("\n"));
            await table.bulkInsert(loadFile);
            setStage(key, "CLEANUP");
            await Promise.all([
                generalClient.sadd(INSERT_CACHE, list),
                insertsClient.srem(key, list),
            ]);
        }
        fs.unlinkSync(loadFile);
        KEY_LOCK.delete(key);
        setStage(key, "UNLOCKED");
    } catch (err) {
        fs.unlinkSync(loadFile);
        KEY_LOCK.delete(key);
        setStage(key, "UNLOCKED BY ERROR");
        setStage("ERRORS", stages.ERRORS ? `${parseInt(stages.ERRORS[0]) + 1}` : "1");
        throw err;
    }
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
