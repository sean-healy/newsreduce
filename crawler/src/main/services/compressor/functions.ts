import fs from "fs";
import path from "path";
import { tmpDirPromise, TAR, nullFilePromise, safeMkdir, blobDirPromise } from "common/config";
import { spawn } from "child_process";
import { COMPRESSOR_LOCK, SYNC_LOCK } from "common/events";
import { Redis, REDIS_PARAMS } from "common/Redis";
import { fancyLog, spawnPromise } from "common/util";
import { lastChangedAfter, lastChangedBefore } from "file";
import { PromisePool } from "common/PromisePool";

const ZSTD = "zstd";
const MK_TAR_ARGS = ["--zstd", "-cvf"];
// Only compress files not touched in past 5s.
const SAFETY_PERIOD_MS = 5000;

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
    const blobDir = await blobDirPromise();
    const entities = fs.readdirSync(tmpDir);
    const promises = new PromisePool(50);
    let newArcs = 0;
    let oldArcs = 0;
    for (const entity of entities) {
        const tmpEntitiesDir = path.join(tmpDir, entity);
        const tmpEntityIDs = fs.readdirSync(tmpEntitiesDir).filter(dir => dir.match(/^[0-9]+$/));
        if (!tmpEntityIDs.length) continue;
        fancyLog(`compressing ${tmpEntityIDs.length} entities.`);
        const entitiesDir = path.join(blobDir, entity);
        await safeMkdir(entitiesDir);
        for (const entityID of tmpEntityIDs) {
            const tmpEntityDir = path.join(tmpEntitiesDir, entityID);
            const compressedSrc = `${tmpEntityDir}.tzst`
            const compressedDst = path.join(entitiesDir, `${entityID}.tzst`);
            const arc = `${tmpEntityDir}.tar`
            const cwd = { cwd: tmpEntitiesDir };
            await promises.register(async res => {
                if (lastChangedAfter(tmpEntityDir, SAFETY_PERIOD_MS)) {
                    fancyLog("entity modified too recently.");
                    res();
                    return;
                }
                const compressedArcExists = fs.existsSync(compressedDst);
                if (compressedArcExists) {
                    try {
                        await spawnPromise(() => spawn(ZSTD, ["-df", compressedDst, "-o", arc]));
                    } catch (e) {
                        fancyLog("error decompressing");
                        fancyLog(JSON.stringify(e));
                        if (fs.existsSync(arc)) fs.unlinkSync(arc);
                        res();
                        return;
                    }
                    try {
                        await spawnPromise(() => spawn(TAR, ["-uvf", arc, entityID], cwd));
                    } catch (e) {
                        fancyLog("error updating tar");
                        fancyLog(JSON.stringify(e));
                        if (fs.existsSync(arc)) fs.unlinkSync(arc);
                        res();
                        return;
                    }
                    try {
                        await spawnPromise(() => spawn(ZSTD, ["-f", arc, "-o", compressedSrc]));
                    } catch (e) {
                        fancyLog("error recompressing tar");
                        fancyLog(JSON.stringify(e));
                        if (fs.existsSync(arc)) fs.unlinkSync(arc);
                        if (fs.existsSync(compressedSrc)) fs.unlinkSync(compressedSrc);
                        res();
                        return;
                    }
                    if (fs.existsSync(arc))
                        fs.renameSync(arc, await nullFilePromise(arc));
                    ++oldArcs;
                } else {
                    try {
                        await spawnPromise(() => spawn(TAR, [...MK_TAR_ARGS, compressedSrc, entityID], cwd));
                    } catch (e) {
                        fancyLog("error creating tar");
                        fancyLog(JSON.stringify(e));
                        if (fs.existsSync(compressedSrc)) fs.unlinkSync(compressedSrc);
                        res();
                        return;
                    }
                    ++newArcs
                }
                if (fs.existsSync(compressedSrc))
                    fs.renameSync(compressedSrc, compressedDst);
                // Recheck last changed time, in case of concurrency bugs.
                if (fs.existsSync(tmpEntityDir) && lastChangedBefore(tmpEntityDir, SAFETY_PERIOD_MS))
                    fs.renameSync(tmpEntityDir, await nullFilePromise(tmpEntityDir));
                res();
            });
        }
    }

    await promises.flush();
    redis.del(SYNC_LOCK);
    fancyLog("Released sync lock");
    fancyLog(`${newArcs} archives created.`);
    fancyLog(`${oldArcs} archives updated.`);
}
