import fs from "fs";
import path from "path";
import crypto from "crypto";
import { spawn } from "child_process";
import { getBlobDir, TAR, safeMkdir, getRawDir } from "common/config";
import { Entity, entityName } from "types/Entity";
import { fancyLog, spawnPromise, CMP_INT } from "common/util";
import { VersionType } from "types/db-objects/VersionType";

const FINISH = "finish";
const ERROR = "error";
const TAR_LS_PARAMS = "-atf";
const TAR_CAT_PARAMS_BEFORE_FILE = "-axf";
const TAR_CAT_PARAMS_AFTER_FILE = "-O";

export async function entityIDs(entity: Entity) {
    const entityDir = path.join(await getBlobDir(), entityName(entity));
    const files = fs.readdirSync(entityDir);
    return files
        .map(file => file.match(/^([0-9]+)\.tzst$/))
        .filter(match => match)
        .map(match => match[1])
        .map(BigInt);
}

export function randomBufferFile() {
    return path.join("/tmp", crypto.randomBytes(30).toString("hex"));
}

/**
 * @param entityID the ID of the resource to be saved (a hash of the URL)
 * @param version  the version of the resource to be saved (milliseconds
 *                 since 1970-01-01 00:00:00)
 * @param src      the source of data to be saved, either as a string of
 *                 the raw data or an input stream
 * 
 * @return number of bytes written
 */
export async function write(
    entity: Entity,
    entityID: bigint,
    version: number,
    format: VersionType,
    src: NodeJS.ReadableStream | string | Buffer
) {
    const bufferFile = randomBufferFile();
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

    return replace(entity, entityID, version, format, bufferFile, bytesWritten);
}

export async function replace(
    entity: Entity,
    entityID: bigint,
    version: number,
    format: VersionType,
    bufferFile: string,
    length: number,
) {
    let bytesWritten = length;
    const versions = await findVersions(entity, entityID);
    const found =
        versions.find(vAndFormat =>
            vAndFormat[0] === version && vAndFormat[1].filename === format.filename)
    if (found) {
        fancyLog(`file already exists: ${entityID}(v${version})`);
        bytesWritten = -1;
        if (fs.existsSync(bufferFile)) {
            try {
                fs.unlinkSync(bufferFile);
            } catch (e) {
                fancyLog("exception while removing file.");
                fancyLog(JSON.stringify(e));
            }
        }
    } else {
        const dir = path.join(await getRawDir(), entityName(entity), `${entityID}`);
        const tmpFile = path.join(dir, `${version}_${format.filename}`);
        await safeMkdir(dir);
        try {
            fs.renameSync(bufferFile, tmpFile);
        } catch (e) {
            fancyLog("exception while renaming file.");
            fancyLog(JSON.stringify(e));
            bytesWritten = -1;
        }
    }

    return bytesWritten;
}

export function safeCtime(path: string) {
    let ctime: number;
    try {
        const stat = fs.statSync(path);
        ctime = stat.ctimeMs;
    } catch (e) {
        fancyLog("exception during stat");
        fancyLog(JSON.stringify(e));
        return -1;
    }

    return ctime;
}

export function safeExists(path: string, fallback = false) {
    let exists: boolean;
    try {
        exists = fs.existsSync(path);
    } catch (e) {
        fancyLog(`error while checking if path exists: ${path}`);
        fancyLog(JSON.stringify(e));
        exists = fallback;
    }

    return exists;
}

/*
 * Returns true if the path has been modified before 'ms'
 * milliseconds ago (exclusive).
 */
export function lastChangedBefore(path: string, ms: number) {
    return safeCtime(path) + ms < Date.now();
}
/*
 * Returns true if the path has been modified after 'ms'
 * milliseconds ago (inclusive).
 */
export function lastChangedAfter(path: string, ms: number) {
    return !lastChangedBefore(path, ms);
}

type VersionSignature = [number, VersionType];
export const compareVersionSignatures = (v1: VersionSignature, v2: VersionSignature) => {
    const vID1 = v1[0];
    const vID2 = v2[0];
    const cmp = vID1 - vID2;
    if (cmp !== 0) return cmp;
    const vType1 = v1[1];
    const vType2 = v2[1];
    if (vType1.filename < vType2.filename) return -1;
    if (vType1.filename > vType2.filename) return +1;
    return 0;
};

export async function findVersions(entity: Entity, entityID: bigint) {
    const blobDir = await getBlobDir();
    const compressedArc = path.join(blobDir, entityName(entity), `${entityID}.tzst`);
    // Ignore files that have not been written yet.
    if (!fs.existsSync(compressedArc)) return [];

    return (await spawnPromise(() => spawn(TAR, [TAR_LS_PARAMS, compressedArc])))
        .toString()
        .split("\n")                                // Separate out lines.
        .map(line => line.replace(/^[0-9]+\//, "")) // Remove redundant entity ID.
        .filter(line => line.match(/^[0-9]+_/))     // Ensure this addresses a file.
        .map(line => line.split(/[/_]/, 2))         // Split on spaces and underscore.
        .map(arr => [
            parseInt(arr[0]),
            new VersionType(arr[1])
        ] as VersionSignature)
        .sort(compareVersionSignatures);
}
export async function findTimes(entity: Entity, entityID: bigint) {
    return [...new Set((await findVersions(entity, entityID)).map(([time,]) => time))].sort((a, b) => a - b);
}
export async function findFormatTimes(entity: Entity, entityID: bigint, format: VersionType) {
    const versions = await findVersions(entity, entityID);
    const times = versions
        .filter(([, f]) => f.filename === format.filename)
        .map(([time,]) => time);
    return [...new Set(times)].sort(CMP_INT);
}
export async function findFormats(entity: Entity, entityID: bigint, time: number) {
    return (await findVersions(entity, entityID))
        .filter(([ms,]) => ms === time)
        .map(([, format]) => format);
}

export async function exists(entity: Entity, entityID: bigint, time: number, format: VersionType) {
    const formats = await findFormats(entity, entityID, time);
    return !!formats.find(f => f.filename === format.filename);
}

export async function read(
    entity: Entity,
    entityID: bigint,
    time: number,
    format: VersionType
) {
    const blobDir = await getBlobDir();
    const compressedArc = path.join(blobDir, entityName(entity), `${entityID}.tzst`);
    const tarPath = path.join(`${entityID}`, `${time}_${format.filename}`);
    // Ignore files that are not written yet.
    if (!fs.existsSync(compressedArc)) return null;
    const params = [TAR_CAT_PARAMS_BEFORE_FILE, compressedArc, TAR_CAT_PARAMS_AFTER_FILE, tarPath];

    return await spawnPromise(() => spawn(TAR, params));
}

export async function stream(
    entity: Entity,
    entityID: bigint,
    time: number,
    format: VersionType
) {
    const blobDir = await getBlobDir();
    const compressedArc = path.join(blobDir, entityName(entity), `${entityID}.tzst`);
    const tarPath = path.join(`${entityID}`, `${time}_${format.filename}`);
    // Ignore files that are not written yet.
    if (!fs.existsSync(compressedArc)) return null;
    const params = [TAR_CAT_PARAMS_BEFORE_FILE, compressedArc, TAR_CAT_PARAMS_AFTER_FILE, tarPath];

    return spawn(TAR, params).stdout;
}
export async function findLatestVersion(
    entity: Entity,
    entityID: bigint,
    format: VersionType
) {
    const versions = await findVersions(entity, entityID);
    const sorted = versions
        .filter(version => version[1].filename === format.filename)
        .sort((a, b) => {
            const cmp = a[0] - b[0];
            if (cmp !== 0) return cmp;
            if (a[1].filename < b[1].filename) return -1;
            if (a[1].filename > b[1].filename) return +1;
            return 0;
        });
    if (!sorted || !sorted.length) return -1;
    else {
        const [time,] = sorted[sorted.length - 1];
        return time;
    }
}
export async function readLatestVersion(
    entity: Entity,
    entityID: bigint,
    format: VersionType,
) {
    const latestVersion = await findLatestVersion(entity, entityID, format);
    if (latestVersion === -1) return null;
    return await read(entity, entityID, latestVersion, format);
}
