import fs from "fs";
import path from "path";
import { tmpDirPromise, TAR, nullFilePromise, safeMkdir } from "common/config";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { log } from "common/logging";
import { COMPRESSOR_LOCK } from "common/events";
import { Redis, REDIS_PARAMS } from "common/Redis";

const ZSTD = "zstd";
const MV = "mv";

function spawnSeq(sequence: [string, string, string[]][], res: () => void, rej: (err: string) => void) {
    if (sequence.length === 0) res();
    else {
        const [head, ...tail] = sequence;
        log(JSON.stringify(head));
        const [command, cwd, args] = head;
        let process: ChildProcessWithoutNullStreams;
        if (cwd) process = spawn(command, args, { cwd });
        else process = spawn(command, args);
        const err = [];
        process.stderr.on("data", data => err.push(data));
        process.on("close", c => c === 0 ? spawnSeq(tail, res, rej) : rej(Buffer.concat(err).toString()));
    }
}

export function isEntityLocked(entityID: string) {
    return Redis.renewRedis(REDIS_PARAMS.fileLock).eq(entityID);
}

export async function compress() {
    const locked = await Redis.renewRedis(REDIS_PARAMS.general).eq(COMPRESSOR_LOCK);
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
                promises.push(new Promise<void>(async (res, rej) => spawnSeq([
                    [ZSTD, undefined, ["-df", compressedArc, "-o", arc]],
                    [TAR, entitiesDir, ["-uvf", arc, entityID]],
                    [ZSTD, undefined, ["-f", arc, "-o", compressedArc]],
                    [MV, undefined, [arc, await nullFilePromise(arc)]],
                    [MV, undefined, [entityDir, await nullFilePromise(entityDir)]],
                ], res, rej)));
            } else {
                await safeMkdir(path.dirname(compressedArc));
                promises.push(new Promise<void>(async (res, rej) => spawnSeq([
                    [TAR, entitiesDir, ["--zstd", "-cvf", compressedArc, entityID]],
                    [MV, undefined, [entityDir, await nullFilePromise(entityDir)]],
                ], res, rej)));
            }
        }
    }

    await Promise.all(promises);
}
