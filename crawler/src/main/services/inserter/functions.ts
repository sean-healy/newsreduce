import fs from "fs";
import path from "path";
import crypto from "crypto";
import { DBObject } from "types/DBObject";
import { Redis, REDIS_PARAMS } from "common/Redis";
import { SQL } from "common/SQL";
import { INSERT_CACHE } from "common/events";
import { tabulate, fancyLog } from "common/util";

const BATCH_SIZE = 50000;

const KEY_LOCK = new Set<string>();

const stages: { [key: string]: [string, number] } = {};

function printStages() {
    const tmpStages: { [key: string]: any }[] = [];
    for (const key in stages) {
        const [stage, time] = stages[key];
        tmpStages.push({
            table: key,
            stage,
            elapsed: Date.now() - time,
        });
    }
    tabulate(tmpStages);
}

function setStage(key: string, value: string) {
    const prev = stages[key];
    if (!prev || prev[0] !== value) {
        stages[key] = [value, Date.now()];
        printStages();
    }
    else fancyLog("stage re-entered: " + value);
}

function randomTmpFile() {
    const basename = crypto.randomBytes(30).toString("hex");
    return path.join("/tmp", basename);
}

const NEW_SADD_FEATURE = false;

export async function insertForKey(key: string) {
    const loadFile: string = randomTmpFile();
    const table = DBObject.forTable(key);
    //fancyLog(JSON.stringify(table));
    try {
        const insertsClient = Redis.renewRedis(REDIS_PARAMS.inserts);
        const generalClient = Redis.renewRedis(REDIS_PARAMS.general)
        let list = await insertsClient.srandmember(key, BATCH_SIZE);
        if (list && list.length !== 0) {
            let rows = list;
            if (!NEW_SADD_FEATURE)
                rows = rows.map(row => row.charAt(0) === "[" ? SQL.csvRow(JSON.parse(row)) : row);
            setStage(key, `INSERTING (${list.length} ${path.basename(loadFile).substr(0, 4)})`);
            //fancyLog(rows.join("\n"));
            fs.writeFileSync(loadFile, rows.join("\n"));
            await table.bulkInsert(loadFile);
            await Promise.all([
                generalClient.sadd(INSERT_CACHE,
                    rows.map(row => DBObject.generateInsertedKey(table.table(), row))),
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
        insertForKey(key);
    }
}

export async function bulkInsert() {
    asyncBulkInsert();
}
