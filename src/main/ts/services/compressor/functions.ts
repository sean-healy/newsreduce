import fs from "fs";
import path from "path";
import { getPreBlobDir, TAR, nullFile, safeMkdir, getBlobDir } from "common/config";
import { spawn } from "child_process";
import { COMPRESSOR_LOCK, SYNC_LOCK } from "common/events";
import { Redis, REDIS_PARAMS } from "common/Redis";
import { fancyLog, spawnPromise } from "common/util";
import { lastChangedAfter, lastChangedBefore, randomBufferFile, safeExists } from "file";
import { PromisePool } from "common/PromisePool";
import { string } from "yargs";

const ZSTD = "zstd";
const RSYNC = "rsync";
const MK_TAR_ARGS = ["--zstd", "-cvf"];
// Only compress files not touched in past 5s.
export const SAFETY_PERIOD_MS = 5000;

export async function compress() {
    const redis = Redis.renewRedis(REDIS_PARAMS.local);
    const locked = await redis.eq(COMPRESSOR_LOCK);
    if (locked) {
        fancyLog("Compressor locked while syncing.");
        return;
    }
    redis.setex(SYNC_LOCK, 3600);
    const preBlobDir = await getPreBlobDir();
    const blobDir = await getBlobDir();
    const entities = fs.readdirSync(preBlobDir);
    const promises = new PromisePool(50);
    let newArcs = 0;
    let oldArcs = 0;
    for (const entity of entities) {
        const preBlobEntityDir = path.join(preBlobDir, entity);
        const preBlobEntityIDs = fs.readdirSync(preBlobEntityDir).filter(dir => dir.match(/^[0-9]+$/));
        if (!preBlobEntityIDs.length) continue;
        fancyLog(`compressing ${preBlobEntityIDs.length} entities.`);
        const blobEntityDir = path.join(blobDir, entity);
        await safeMkdir(blobEntityDir);
        for (const preBlobEntityID of preBlobEntityIDs) {
            console.log(preBlobEntityID);
            const preBlobObjectDir = path.join(preBlobEntityDir, preBlobEntityID);
            const compressedSrc = path.join(preBlobEntityDir, `${preBlobEntityID}.tzst`);
            const compressedDst = path.join(blobEntityDir, `${preBlobEntityID}.tzst`);
            await promises.registerFn(async res => {
                if (lastChangedAfter(preBlobObjectDir, SAFETY_PERIOD_MS)) res();
                else {
                    let compressFrom: string;
                    const tmp = randomBufferFile();
                    const rsyncParams = ["-r", preBlobObjectDir, tmp];
                    try {
                        const update = safeExists(compressedDst);
                        if (update) {
                            await safeMkdir(tmp);
                            compressFrom = path.join(tmp, preBlobEntityID);
                            await spawnPromise(() => spawn(TAR, ["-xf", compressedDst, "-C", tmp]));
                            await spawnPromise(() => spawn(RSYNC, rsyncParams));
                            ++oldArcs;
                        } else {
                            compressFrom = preBlobObjectDir;
                            ++newArcs
                        }
                        const params = [...MK_TAR_ARGS, compressedSrc, path.basename(compressFrom)];
                        await spawnPromise(() => spawn(TAR, params, { cwd: path.dirname(compressFrom) }));
                        if (safeExists(compressedSrc)) fs.renameSync(compressedSrc, compressedDst);
                        if (update)
                            if (safeExists(tmp)) fs.renameSync(tmp, await nullFile(tmp));
                        if (safeExists(preBlobObjectDir) && lastChangedBefore(preBlobObjectDir, SAFETY_PERIOD_MS))
                            fs.renameSync(preBlobObjectDir, await nullFile(preBlobObjectDir));
                    } catch (e) {
                        fancyLog("error during compress");
                        fancyLog(JSON.stringify(e));
                        if (safeExists(tmp)) fs.renameSync(tmp, await nullFile(tmp));
                        if (safeExists(compressedSrc)) fs.unlinkSync(compressedSrc);
                    }
                    res();
                }
            });
        }
    }

    await promises.flush();
    redis.del(SYNC_LOCK);
    if (newArcs || oldArcs) {
        fancyLog(`${newArcs} archives created.`);
        fancyLog(`${oldArcs} archives updated.`);
    }
}
