import fs from "fs";
import { tmpDirPromise, TAR, nullFilePromise } from "common/config";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { log } from "common/logging";
import { renewRedis, REDIS_PARAMS } from "common/connections";
import { STR_ONE } from "common/util";

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
    return new Promise<boolean>(res =>
        renewRedis(REDIS_PARAMS.fileLock).get(entityID, (err, response) =>
            res(!err && response === STR_ONE)));
}

export async function compress() {
    const tmpDir = await tmpDirPromise();
    const entities = fs.readdirSync(tmpDir);
    const promises: Promise<void>[] = [];
    for (const entity of entities) {
        const entitiesDir = `${tmpDir}/${entity}`;
        const entityIDs = fs.readdirSync(entitiesDir).filter(dir => dir.match(/^[0-9]+$/));
        for (const entityID of entityIDs) {
            if (await isEntityLocked(entityID)) continue;
            console.log(entityID);
            const entityDir = `${entitiesDir}/${entityID}`;
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
                promises.push(new Promise<void>(async (res, rej) => spawnSeq([
                    [TAR, entitiesDir, ["--zstd", "-cvf", compressedArc, entityID]],
                    [MV, undefined, [entityDir, await nullFilePromise(entityDir)]],
                ], res, rej)));
            }
        }
    }

    await Promise.all(promises);
}
