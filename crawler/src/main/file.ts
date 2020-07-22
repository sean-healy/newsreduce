import fs from "fs";
import path from "path";
import { spawn } from "child_process";
import { blobDirPromise, tmpDirPromise, TAR, safeMkdir } from "common/config";
import { log } from "common/logging";
import { FileFormat, formatToFileName, fileNameToFormat } from "types/FileFormat";
import { Entity, entityName } from "types/Entity";

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
    const dir = path.join(await tmpDirPromise(), entityName(entity), `${entityID}`, `${version}`);
    await safeMkdir(dir);
    const tmpFile = `${dir}/${formatToFileName(format)}`;
    log("Writing to", tmpFile);
    const dst = fs.createWriteStream(tmpFile);
    let bytesWritten: number;
    if (typeof src === "string" || src instanceof Buffer) {
        log("Writing string to file", src, tmpFile);
        fs.writeFileSync(tmpFile, src);
        bytesWritten = src.length;
    } else {
        bytesWritten = await new Promise<number>(async (res, rej) => {
            dst.on(ERROR, err => rej(err));
            dst.on(FINISH, () => res(dst.bytesWritten));
            src.pipe(dst);
        });
    }

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
function lastModifiedBefore(path: string, ms: number) {
    const stat = fs.statSync(path);
    return stat.mtimeMs + ms < Date.now();
}
/*
 * Returns true if the path has been modified after 'ms'
 * milliseconds ago (inclusive).
 */
function lastModifiedAfter(path: string, ms: number) {
    return !lastModifiedBefore(path, ms);
}
export async function findVersions(entity: Entity, entityID: bigint) {
    const blobDir = await blobDirPromise();
    const compressedArc = path.join(blobDir, entityName(entity), `${entityID}.tzst`);
    // Ignore files that are not written yet, or that have been written too recently.
    if (!fs.existsSync(compressedArc) || lastModifiedAfter(compressedArc, 4000)) return [];
    const params = [TAR_LS_PARAMS, compressedArc];
    const versions = [];
    const err = [];
    return await new Promise<[number, FileFormat][]>(async (res, rej) => {
        const tarLS = spawn(TAR, params);
        tarLS.on("error", err => rej(err));
        tarLS.stdout.on("data", (data: Buffer) => {
            for (const version of data
                .toString()
                .split("\n")
                .map(line => line.replace(/^[0-9]+\//, ""))
                .filter(line => line.match(/^[0-9]+\/./))
                .map(line => line.split("/", 2))
                .map(arr => [parseInt(arr[0]), fileNameToFormat(arr[1])]))
                versions.push(version);
        });
        tarLS.stderr.on("data", (data: Buffer) => err.push(data));
        tarLS.on("close", code => code === 0 ? res(sortVersions(versions)) : rej(err.join("\n")));
    });
}
export async function findFormats(entity: Entity, entityID: bigint, version: number) {
    return (await findVersions(entity, entityID))
        .filter(([time,]) => time === version)
        .map(([, format]) => format);
}

export async function read(entity: Entity, entityID: bigint, version: number, format: FileFormat) {
    const blobDir = await blobDirPromise();
    const compressedArc = path.join(blobDir, entityName(entity), `${entityID}.tzst`);
    const tarPath = path.join(`${entityID}`, `${version}`, formatToFileName(format));
    // Ignore files that are not written yet, or that have been written too recently.
    if (!fs.existsSync(compressedArc) || lastModifiedAfter(compressedArc, 4000)) return null;
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
