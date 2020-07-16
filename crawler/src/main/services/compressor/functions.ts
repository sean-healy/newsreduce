import fs from "fs";
import path from "path";
import { tmpDirPromise, TAR, nullFilePromise, safeMkdir } from "common/config";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { log } from "common/logging";
import { COMPRESSOR_LOCK } from "common/events";
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

const ZSTD = "zstd";
const MV = "mv";

async function spawnSeq(sequence: [string, string, string[]][]) {
    if (sequence.length === 0) return;
    else {
        const [head, ...tail] = sequence;
        log(JSON.stringify(head));
        const [command, cwd, args] = head;
        let promise: Promise<string>;
        if (cwd) promise = tryLoop(() => spawn(command, args, { cwd }));
        else promise = tryLoop(() => spawn(command, args));
        const stdout = await promise;
        if (stdout) {
            log(JSON.stringify(head));
            log("STDOUT:");
            log(stdout);
        }
        await spawnSeq(tail);
    }
}

export function isEntityLocked(entityID: string) {
    return Redis.renewRedis(REDIS_PARAMS.fileLock).eq(entityID);
}

export async function compress() {
    const locked = await Redis.renewRedis(REDIS_PARAMS.local).eq(COMPRESSOR_LOCK);
    if (locked) return;
    const tmpDir = await tmpDirPromise();
    const entities = fs.readdirSync(tmpDir);
    const promises: Promise<void>[] = [];
    for (const entity of entities) {
        const entitiesDir = path.join(tmpDir, entity);
        const entityIDs = fs.readdirSync(entitiesDir).filter(dir => dir.match(/^[0-9]+$/));
        for (const entityID of entityIDs) {
            if (await isEntityLocked(entityID)) continue;
            console.log(entityID);
            const entityDir = path.join(entitiesDir, entityID);
            const compressedArc = `${entityDir.replace(/\/tmp\//, "/blobs/")}.tzst`
            const arc = `${entityDir}.tar`
            const compressedArcExists = fs.existsSync(compressedArc);
            if (compressedArcExists) {
                promises.push(spawnSeq([
                    [ZSTD, undefined, ["-df", compressedArc, "-o", arc]],
                    [TAR, entitiesDir, ["-uvf", arc, entityID]],
                    [ZSTD, undefined, ["-f", arc, "-o", compressedArc]],
                    [MV, undefined, [arc, await nullFilePromise(arc)]],
                    [MV, undefined, [entityDir, await nullFilePromise(entityDir)]],
                ]));
            } else {
                await safeMkdir(path.dirname(compressedArc));
                promises.push(spawnSeq([
                    [TAR, entitiesDir, ["--zstd", "-cvf", compressedArc, entityID]],
                    [MV, undefined, [entityDir, await nullFilePromise(entityDir)]],
                ]));
            }
        }
    }

    await Promise.all(promises);
}
