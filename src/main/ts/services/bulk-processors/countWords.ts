import { spawnPromise } from "utils/alpha";
import { spawn } from "child_process";
import { WordFrequency } from "types/db-objects/WordFrequency";
import { Word } from "types/db-objects/Word";
import { PromisePool } from "common/PromisePool";
import { Redis } from "common/Redis";
import { SQL } from "common/SQL";

export async function main() {
    const buffer = await spawnPromise(() => spawn("./src/main/bash/word-frequencies.sh"));
    const pool = new PromisePool(50);
    for (const line of buffer.toString().split("\n")) {
        if (!line) continue;
        const parts = line.match(/\w+/g);
        const count = parseInt(parts[0]);
        const word = parts[1];
        if (word) {
            await pool.registerPromise(new WordFrequency({
                word: new Word(word),
                frequency: count,
            }).enqueueInsert());
        }
    }
    await pool.flush();
    await Redis.quit();
    (await SQL.db()).destroy();
}

main();