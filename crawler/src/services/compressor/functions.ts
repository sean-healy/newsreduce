import fs from "fs";
import { tmpDirPromise, TAR, nullFilePromise } from "common/config";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { log } from "common/logging";
import { renewRedis } from "common/connections";
import { STR_ONE } from "common/util";

const ZSTD = "zstd";
const MV = "mv";

function spawnSequence(sequence: [string, string, string[]][], res: () => void, rej: (err: string) => void) {
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
        process.on("close", code => {
            switch (code) {
                case 0:
                    spawnSequence(tail, res, rej);
                    break;
                default:
                    console.debug("ERR", code, JSON.stringify(head));
                    console.debug(head);
                    console.debug(Buffer.concat(err).toString());
                    rej(Buffer.concat(err).toString());
            }
        });
    }
}

export async function compress(tmpDir?: string) {
    if (!tmpDir) tmpDir = await tmpDirPromise();
    const entities = fs.readdirSync(tmpDir);
    for (const entity of entities) {
        const entitiesDir = `${tmpDir}/${entity}`;
        const entityIDs = fs.readdirSync(entitiesDir).filter(dir => dir.match(/^[0-9]+$/));
        for (const entityID of entityIDs) {
            const locked = await new Promise<boolean>(res => {
                renewRedis("lockedFiles").get(entityID, (err, response) => {
                    res(!err && response === STR_ONE);
                });
            });
            if (locked) continue;
            const entityDir = `${entitiesDir}/${entityID}`;
            const compressedArc = `${entityDir.replace(/\/tmp\//, "/blobs/")}.tzst`
            const arc = `${entityDir}.tar`
            const compressedArcExists = fs.existsSync(compressedArc);
            if (compressedArcExists) {
                spawnSequence([
                    [ZSTD, undefined, ["-df", compressedArc, "-o", arc]],
                    [TAR, entitiesDir, ["-uvf", arc, entityID]],
                    [ZSTD, undefined, ["-f", arc, "-o", compressedArc]],
                    [MV, undefined, [arc, await nullFilePromise(arc)]],
                    [MV, undefined, [entityDir, await nullFilePromise(entityDir)]],
                ], () => { }, () => { });
            } else {
                spawnSequence([
                    [TAR, entitiesDir, ["--zstd", "-cvf", compressedArc, entityID]],
                    [MV, undefined, [entityDir, await nullFilePromise(entityDir)]],
                ], () => { }, () => { });
            }
        }
    }
}
