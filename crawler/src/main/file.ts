import fs from "fs";
import path from "path";
import crypto from "crypto";
import { spawn } from "child_process";
import { blobDirPromise, tmpDirPromise, TAR, safeMkdir } from "common/config";
import { FileFormat, formatToFileName, fileNameToFormat } from "types/FileFormat";
import { Entity, entityName } from "types/Entity";
import { fancyLog, spawnPromise } from "common/util";

const FINISH = "finish";
const ERROR = "error";
const TAR_LS_PARAMS = "-atf";
const TAR_CAT_PARAMS_BEFORE_FILE = "-axf";
const TAR_CAT_PARAMS_AFTER_FILE = "-O";

export async function entityIDs(entity: Entity) {
    const entityDir = path.join(await blobDirPromise(), entityName(entity));
    const files = fs.readdirSync(entityDir);
    return files
        .map(file => file.match(/^([0-9]+)\.tzst$/))
        .filter(match => match)
        .map(match => match[1])
        .map(BigInt);
}

/**
 * @param entityID the ID of the resource to be saved (a hash of the URL)
 * @param version    the version of the resource to be saved (milliseconds since 1970-01-01 00:00:00)
 * @param src        the source of data to be saved, either as a string of the raw data or an input stream
 * 
 * @return number of bytes written
 */
export async function write(
    entity: Entity,
    entityID: bigint,
    version: number,
    format: FileFormat,
    src: NodeJS.ReadableStream | string | Buffer
) {
    const versions = await findVersions(entity, entityID);
    const found = versions.find(vAndFormat => vAndFormat[0] === version && vAndFormat[1] === format)
    if (found) return -1;
    const bufferFile = path.join("/tmp", crypto.randomBytes(30).toString("hex"));
    //if (fs.existsSync(tmpFile)) {
    //    fancyLog("file already exists: " + tmpFile);
    //    return -1;
    //}
    let bytesWritten: number;
    if (typeof src === "string" || src instanceof Buffer) {
        try {
            fs.writeFileSync(bufferFile, src);
            bytesWritten = src.length;
        } catch (e) {
            fancyLog("exception while writing string to file.");
            fancyLog(JSON.stringify(e));
            bytesWritten = -1;
        }
    } else {
        try {
            const dst = fs.createWriteStream(bufferFile);
            bytesWritten = await new Promise<number>(async (res, rej) => {
                src.on(ERROR, err => rej(err));
                dst.on(ERROR, err => rej(err));
                dst.on(FINISH, () => res(dst.bytesWritten));
                src.pipe(dst);
            });
        } catch (e) {
            fancyLog("exception while writing stream to file.");
            fancyLog(JSON.stringify(e));
            bytesWritten = -1;
        }
    }
    if (bytesWritten >= 0) {
        const dir = path.join(await tmpDirPromise(), entityName(entity), `${entityID}`);
        const tmpFile = path.join(dir, `${version}_${formatToFileName(format)}`);
        await safeMkdir(dir);
        fs.renameSync(bufferFile, tmpFile);
    }
    else if (fs.existsSync(bufferFile)) fs.unlinkSync(bufferFile);

    return bytesWritten;
}

export const sortVersions = (versions: [number, FileFormat][]) => versions.sort((v1, v2) => {
    const vID1 = v1[0];
    const vID2 = v2[0];
    const cmp = vID1 - vID2;
    if (cmp !== 0) return cmp;
    const vFormat1 = v1[1];
    const vFormat2 = v2[1];
    return vFormat1 - vFormat2;
});
/*
 * Returns true if the path has been modified before 'ms'
 * milliseconds ago (exclusive).
 */
export function lastChangedBefore(path: string, ms: number) {
    const stat = fs.statSync(path);
    return stat.ctimeMs + ms < Date.now();
}
/*
 * Returns true if the path has been modified after 'ms'
 * milliseconds ago (inclusive).
 */
export function lastChangedAfter(path: string, ms: number) {
    return !lastChangedBefore(path, ms);
}
export async function findVersions(entity: Entity, entityID: bigint) {
    const blobDir = await blobDirPromise();
    const compressedArc = path.join(blobDir, entityName(entity), `${entityID}.tzst`);
    // Ignore files that are not written yet, or that have been written too recently.
    if (!fs.existsSync(compressedArc) || lastChangedAfter(compressedArc, 3000)) return [];

    return (await spawnPromise(() => spawn(TAR, [TAR_LS_PARAMS, compressedArc])))
        .split("\n")                                               // Separate out lines.
        .map(line => line.replace(/^[0-9]+\//, ""))                // Remove redundant entity ID.
        .filter(line => line.match(/^[0-9]+_/))                    // Ensure this addresses a file.
        .map(line => line.split(/[/_]/, 2))                        // Split on spaces and underscore.
        .map(arr => [parseInt(arr[0]), fileNameToFormat(arr[1])]); // parse time and format pieces.
}
export async function findFormats(entity: Entity, entityID: bigint, version: number) {
    return (await findVersions(entity, entityID))
        .filter(([time,]) => time === version)
        .map(([, format]) => format);
}

export async function read(entity: Entity, entityID: bigint, version: number, format: FileFormat) {
    const blobDir = await blobDirPromise();
    const compressedArc = path.join(blobDir, entityName(entity), `${entityID}.tzst`);
    const tarPath = path.join(`${entityID}`, `${version}_${formatToFileName(format)}`);
    // Ignore files that are not written yet, or that have been written too recently.
    if (!fs.existsSync(compressedArc) || lastChangedAfter(compressedArc, 4000)) return null;
    return await new Promise<Buffer>((res, rej) => {
        const tarCat =
            spawn(TAR, [TAR_CAT_PARAMS_BEFORE_FILE, compressedArc, TAR_CAT_PARAMS_AFTER_FILE, tarPath]);
        const allData = [];
        tarCat.stdout.on("data", (data: Buffer) => allData.push(data));
        const errData = [];
        tarCat.stderr.on("data", (data: Buffer) => errData.push(data));
        tarCat.on("close", code => code === 0 ? res(Buffer.concat(allData)) : rej(Buffer.concat(errData)));
    });
}
export async function findLatestVersion(entity: Entity, entityID: bigint, format: FileFormat) {
    const versions = await findVersions(entity, entityID);
    const sorted = versions.filter(version => version[1] === format).sort((a, b) => {
        const cmp = a[0] - b[0];
        if (cmp === 0) return a[1] - b[1];
        return cmp;
    });
    if (!sorted || !sorted.length) return -1;
    else {
        const [time,] = sorted[sorted.length - 1];
        return time;
    }
}
export async function readLatestVersion(entity: Entity, entityID: bigint, format: FileFormat) {
    const latestVersion = await findLatestVersion(entity, entityID, format);
    if (latestVersion === -1) return null;
    return await read(entity, entityID, latestVersion, format);
}
