import path from "path";
import crypto from "crypto";
import { tmpDirPromise } from "common/config";
import { DELETE_FILES } from "common/events";
import fs from "fs";
import { Redis, REDIS_PARAMS } from "common/Redis";

async function watch() {
    const client = Redis.newRedis(REDIS_PARAMS.local);
    client.client.subscribe(DELETE_FILES);
    console.log("Subscribed to channel:", DELETE_FILES);
    client.client.on("message", async (_, msg: string) => {
        if (!msg) {
            console.debug("ERR: empty message");
            return;
        }
        const lines: [string, string][] = msg.split("\n").map(line => line.split(/\s+/, 2) as [string, string]);
        for (const [expectedChecksum, suffix] of lines) {
            const cwd = await tmpDirPromise();
            const file = path.join(cwd, suffix);
            const content = fs.readFileSync(file);
            const actualChecksum = crypto.createHash("md5").update(content).digest().toString("hex");
            if (expectedChecksum === actualChecksum) {
                console.log("Removing file:", file);
                fs.unlink(file, err => {
                    if (err) console.log(err);
                });
            } else {
                console.debug("checksum mismatch", actualChecksum, expectedChecksum);
            }
        }
    });
}
watch();
