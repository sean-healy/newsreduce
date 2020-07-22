import fs from "fs";
import path from "path";
import { tmpDirPromise, TAR, nullFilePromise, safeMkdir } from "common/config";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { log } from "common/logging";
import { COMPRESSOR_LOCK, SYNC_LOCK } from "common/events";
import { Redis, REDIS_PARAMS } from "common/Redis";
import { fancyLog } from "common/util";
import { lastModifiedAfter } from "file";

async function tryLoop(spawner: () => ChildProcessWithoutNullStreams) {
    for (let attempt = 0; attempt < 10; attempt++) {
        try {
            const content = await new Promise<string>((res, rej) => {
                const process = spawner();
                process.on("error", err => rej(err));
                process.stdout.on("error", err => rej(err));
                process.stderr.on("error", err => {
                    fancyLog("stderr error");
                    fancyLog(JSON.stringify(err));
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
            fancyLog("Caught error during attempt " + attempt);
            fancyLog(JSON.stringify(err));
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

export async function compress() {
    const redis = Redis.renewRedis(REDIS_PARAMS.local);
    const locked = await redis.eq(COMPRESSOR_LOCK);
    if (locked) {
        fancyLog("Compressor locked while syncing.");
        return;
    }
    redis.setex(SYNC_LOCK, 3600);
    fancyLog("Placed sync lock.");
    const tmpDir = await tmpDirPromise();
    const entities = fs.readdirSync(tmpDir);
    const promises: Promise<void>[] = [];
    let newArcs = 0;
    let oldArcs = 0;
    for (const entity of entities) {
        const entitiesDir = path.join(tmpDir, entity);
        const entityIDs = fs.readdirSync(entitiesDir).filter(dir => dir.match(/^[0-9]+$/));
        console.log(`compressing ${entityIDs.length} entities.`);
        for (const entityID of entityIDs) {
            const entityDir = path.join(entitiesDir, entityID);
            const compressedArc = `${entityDir.replace(/\/tmp\//, "/blobs/")}.tzst`
            const arc = `${entityDir}.tar`
            // Only compress files not touched in past 5s.
            if (lastModifiedAfter(entityDir, 5000)) continue;
            const compressedArcExists = fs.existsSync(compressedArc);
            if (compressedArcExists) {
                promises.push(spawnSeq([
                    [ZSTD, undefined, ["-df", compressedArc, "-o", arc]],
                    [TAR, entitiesDir, ["-uvf", arc, entityID]],
                    [ZSTD, undefined, ["-f", arc, "-o", compressedArc]],
                    [MV, undefined, [arc, await nullFilePromise(arc)]],
                    [MV, undefined, [entityDir, await nullFilePromise(entityDir)]],
                ]));
                ++oldArcs;
            } else {
                await safeMkdir(path.dirname(compressedArc));
                promises.push(spawnSeq([
                    [TAR, entitiesDir, ["--zstd", "-cvf", compressedArc, entityID]],
                    [MV, undefined, [entityDir, await nullFilePromise(entityDir)]],
                ]));
                ++newArcs
            }
        }
    }

    await Promise.all(promises);
    redis.del(SYNC_LOCK);
    fancyLog("Released sync lock");
    fancyLog(`${newArcs} archives created.`);
    fancyLog(`${oldArcs} archives updated.`);
}
