import path from "path";
import crypto from "crypto";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { FIND, tmpDirPromise } from "common/config";
import { DELETE_FILES } from "common/events";
import fs from "fs";
import { Redis, REDIS_PARAMS } from "common/Redis";

async function tryLoop(spawner: () => ChildProcessWithoutNullStreams) {
    for (let attempt = 0; attempt < 10; attempt++) {
        try {
            const content = await new Promise<string>((res, rej) => {
                const process = spawner();
                process.on("error", err => rej(err));
                process.stdout.on("error", err => rej(err));
                process.stderr.on("error", (err) => {
                    console.log("stderr error");
                    console.log(err);
                });
                const stdout = [];
                const stderr = [];
                process.stdout.on("data", (data: Buffer) => stdout.push(data));
                process.stderr.on("data", (data: Buffer) => stderr.push(data));
                process.on("close", code => {
                    if (code === 0) {
                        const content = Buffer.concat(stdout).toString();
                        res(content);
                    } else {
                        const content = Buffer.concat(stderr).toString();
                        rej(content);
                    }
                });
            });

            return content;
        } catch (err) {
            console.debug("Caught error during attempt", attempt);
            console.debug(err);
            await new Promise(res => setTimeout(res, 100));
        }
    }
}

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
