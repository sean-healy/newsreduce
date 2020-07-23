import fs from "fs";
import path from "path";
import { tmpDirPromise, TAR, nullFilePromise, safeMkdir, blobDirPromise } from "common/config";
import { spawn, ChildProcessWithoutNullStreams } from "child_process";
import { COMPRESSOR_LOCK, SYNC_LOCK } from "common/events";
import { Redis, REDIS_PARAMS } from "common/Redis";
import { fancyLog } from "common/util";
import { lastChangedAfter } from "file";
import { PromisePool } from "common/PromisePool";

const ZSTD = "zstd";
const MK_TAR_ARGS = ["--zstd", "-cvf"];

async function spawnPromise(spawner: () => ChildProcessWithoutNullStreams) {
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
    const blobDir = await blobDirPromise();
    const entities = fs.readdirSync(tmpDir);
    const promises = new PromisePool(100);
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
            // Only compress files not touched in past 5s.
            if (lastChangedAfter(tmpEntityDir, 5000)) continue;
            const cwd = { cwd: tmpEntitiesDir };
            await promises.register(async res => {
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
                    if (fs.existsSync(compressedSrc))
                        fs.renameSync(compressedSrc, compressedDst);
                    if (fs.existsSync(arc))
                        fs.renameSync(arc, await nullFilePromise(arc));
                    if (fs.existsSync(tmpEntityDir))
                        fs.renameSync(tmpEntityDir, await nullFilePromise(tmpEntityDir));
                    res();
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
                    if (fs.existsSync(compressedSrc))
                        fs.renameSync(compressedSrc, compressedDst);
                    if (fs.existsSync(tmpEntityDir))
                        fs.renameSync(tmpEntityDir, await nullFilePromise(tmpEntityDir));
                    res();
                    ++newArcs
                }
            });
        }
    }

    await promises.flush();
    redis.del(SYNC_LOCK);
    fancyLog("Released sync lock");
    fancyLog(`${newArcs} archives created.`);
    fancyLog(`${oldArcs} archives updated.`);
}
