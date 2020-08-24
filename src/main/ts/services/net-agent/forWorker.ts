import path from "path";
import crypto from "crypto";
import { getRawDir } from "common/config";
import { DELETE_FILES } from "common/events";
import fs from "fs";
import { Redis, REDIS_PARAMS } from "common/Redis";
import { fancyLog } from "utils/alpha";

async function watch() {
    const client = Redis.newSub(REDIS_PARAMS.local);
    client.client.subscribe(DELETE_FILES);
    fancyLog("Subscribed to channel: " + DELETE_FILES);
    client.client.on("message", async (_, msg: string) => {
        if (!msg) {
            fancyLog("ERR: empty message");
            return;
        }
        const lines: [string, string][] = msg.split("\n").map(line => line.split(/\s+/, 2) as any);
        for (const [expectedChecksum, suffix] of lines) {
            const cwd = await getRawDir();
            const file = path.join(cwd, suffix);
            if (!fs.existsSync(file)) {
                fancyLog(`file already deleted: ${file}`);
                continue;
            }
            const content = fs.readFileSync(file);
            const actualChecksum = crypto.createHash("md5").update(content).digest().toString("hex");
            if (expectedChecksum === actualChecksum) {
                fancyLog("Removing file: " + file);
                fs.unlink(file, err => {
                    if (err) fancyLog(JSON.stringify(err));
                });
            } else {
                fancyLog(`checksum mismatch ${actualChecksum} != ${expectedChecksum}`);
            }
        }
    });
}
watch();
