import path from "path";
import crypto from "crypto";
import { spawn } from "child_process";
import { FIND, tmpDirPromise } from "common/config";
import { DELETE_FILES } from "common/events";
import fs from "fs";
import { Redis, REDIS_PARAMS } from "common/Redis";
import { log } from "common/logging";

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
        for (const [expectedChecksum, file] of lines) {
            const cwd = await tmpDirPromise();
            const dir = path.join(cwd, file);
            const md5sum = spawn(FIND, [file, "-type", "f", "-exec", "md5sum", "{}", "\;"], { cwd });
            md5sum.on("error", err => {
                console.log(err);
            });
            const stdout = [];
            const stderr = [];
            md5sum.stdout.on("data", (data: Buffer) => stdout.push(data));
            md5sum.stderr.on("data", (data: Buffer) => stderr.push(data));
            md5sum.on("close", code => {
                console.log(code);
                const content = Buffer.concat(stdout).toString();
                const actualChecksum = crypto.createHash("md5").update(content).digest().toString("hex");
                if (expectedChecksum === actualChecksum) {
                    console.log("Removing dir:", dir);
                    fs.rmdir(dir, { recursive: true }, err => {
                        if (err) console.log(err);
                    });
                } else {
                    console.debug("checksum mismatch", actualChecksum, expectedChecksum);
                }
            });
        }
    });
}
watch();
