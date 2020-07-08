import fs from "fs";
import { blobDirPromise, tmpDirPromise, TAR } from "./common/config";
import { log } from "./common/logging";
import { spawn } from "child_process";
import { FileFormat, formatToFileName, fileNameToFormat } from "./types/FileFormat";
import { Entity, entityName } from "./types/Entity";

const FINISH = "finish";
const ERROR = "error";
const TAR_LS_PARAMS = "-atf";
const TAR_CAT_PARAMS_BEFORE_FILE = "-axf";
const TAR_CAT_PARAMS_AFTER_FILE = "-O";

export function entityIDs(entity: Entity) {
    return new Promise<bigint[]>((res, rej) => {
        blobDirPromise().then(blobDir => {
            const entityDir = `${blobDir}/${entityName(entity)}`;
            fs.readdir(entityDir, (err, files) => {
                if (err) rej(err);
                else {
                    const ids = [];
                    for (const file of files) {
                        const match = file.match(/^([0-9]+)\.tzst$/);
                        if (match) {
                            const id = BigInt(match[1]);
                            ids.push(id);
                        }
                    }
                    res(ids);
                }
            });
        });
    });
}

export function safeMkdir(dir: string) {
    return new Promise<string>((res, rej) => {
        fs.mkdir(dir, { recursive: true, mode: 0o700 }, (err, result) => {
            if (err) rej(err);
            else {
                res(result);
                log("New dir", dir);
            }
        });
    });
}

async function beforeFileWrite(entity: Entity, entityID: bigint, version: number) {
    const tmpDir = await tmpDirPromise();
    const dir = `${tmpDir}/${entityName(entity)}/${entityID}/${version}`;

    return safeMkdir(dir);
}

/**
 * @param entityID the ID of the resource to be saved (a hash of the URL)
 * @param version    the version of the resource to be saved (milliseconds since 1970-01-01 00:00:00)
 * @param src        the source of data to be saved, either as a string of the raw data or an input stream
 * 
 * @return number of bytes written
 */
export function write(
    entity: Entity,
    entityID: bigint,
    version: number,
    format: FileFormat,
    src: NodeJS.ReadableStream | string | Buffer
) {
    if (typeof src === "string" || src instanceof Buffer) {
        return writeFileFromString(entity, entityID, version, format, src);
    } else {
        return writeFileFromStream(entity, entityID, version, format, src);
    }
}

function writeFileFromStream(entity: Entity, entityID: bigint, version: number, format: FileFormat, src: NodeJS.ReadableStream) {
    return new Promise<number>(async (res, rej) => {
        await beforeFileWrite(entity, entityID, version);
        const tmpDir = await tmpDirPromise();
        const tmpFile = `${tmpDir}/${entityName(entity)}/${entityID}/${version}/${formatToFileName(format)}`;
        log("Writing to", tmpFile);
        const dst = fs.createWriteStream(tmpFile);
        src.pipe(dst);
        dst.on(ERROR, err => {
            console.debug(err);
            rej(err)
        });
        dst.on(FINISH, () => {
            //afterFileWrite(entity, entityID, version, format).then(() => res(dst.bytesWritten)).catch(rej)
            res(dst.bytesWritten);
        });
    });
}

function writeFileFromString(entity: Entity, entityID: bigint, version: number, format: FileFormat, str: string | Buffer) {
    return new Promise<number>(async (res, rej) => {
        await beforeFileWrite(entity, entityID, version);
        const tmpDir = await tmpDirPromise();
        const tmpFile = `${tmpDir}/${entityName(entity)}/${entityID}/${version}/${formatToFileName(format)}`;
        const dst = fs.createWriteStream(tmpFile);
        fs.writeFile(tmpFile, str, err => {
            if (err) rej(err);
            else {
                //afterFileWrite(entity, entityID, version, format).then(() => res(dst.bytesWritten)).catch(rej);
                res(dst.bytesWritten);
            }
        });
    });
}

export function allVersions(entity: Entity, entityID: bigint) {
    return new Promise<[number, FileFormat][]>((res, rej) => {
        blobDirPromise().then(blobDir => {
            const path = `${blobDir}/${entityName(entity)}/${entityID}.tzst`;
            const params = [TAR_LS_PARAMS, path];
            const tarLS = spawn(TAR, params);
            const versions = [];
            tarLS.on("error", err => {
                console.debug("ERR", err);
                rej(err);
            });
            tarLS.stdout.on("data", (data: Buffer) => {
                for (const version of data
                    .toString()
                    .split("\n")
                    .filter(line => line.match(/^[0-9]+\/./))
                    .map(line => line.split("/", 2))
                    .map(arr => [parseInt(arr[0]), fileNameToFormat(arr[1])]))
                    versions.push(version);
            });
            const err = [];
            tarLS.stderr.on("data", (data: Buffer) => err.push(data));
            tarLS.on("close", code => {
                switch (code) {
                    case 0:
                        res(versions);
                        break;
                    default:
                        console.debug(params);
                        console.debug("ERR", code, err);
                        rej(err.join("\n"));
                }
            });
        });
    });
}

export function versions(entity: Entity, fileID: bigint) {
    return new Promise<number[]>((res, rej) => {
        blobDirPromise().then(blobDir => {
            const path = `${blobDir}/${entityName(entity)}/${fileID}.tzst`;
            const tarLS = spawn(TAR, [TAR_LS_PARAMS, path]);
            const timeSet = new Set<number>();
            tarLS.stdout.on("data", (data: Buffer) => {
                for (const time of data
                    .toString()
                    .split("\n")
                    .filter(line => line.match(/^[0-9]+/))
                    .map(line => parseInt(line.split("/", 1)[0]))) {
                    timeSet.add(time);
                }
            });
            const err = [];
            tarLS.stderr.on("data", (data: Buffer) => err.push(data));
            tarLS.on("close", code => {
                switch (code) {
                    case 0: res([...timeSet]);
                    default: rej(err.join("\n"));
                }
            });
        });
    });
}

export function formats(entity: Entity, fileID: bigint) {
    return new Promise<number[]>((res, rej) => {
        blobDirPromise().then(blobDir => {
            const path = `${blobDir}/${entityName(entity)}/${fileID}.tzst`;
            const tarLS = spawn(TAR, [TAR_LS_PARAMS, path]);
            const formatSet = new Set<FileFormat>();
            tarLS.stdout.on("data", (data: Buffer) => {
                for (const time of data
                    .toString()
                    .split("\n")
                    .filter(line => line.match(/^[0-9]+\/./))
                    .map(line => fileNameToFormat(line.split("/", 2)[1]))) {
                    formatSet.add(time);
                }
            });
            const err = [];
            tarLS.stderr.on("data", (data: Buffer) => err.push(data));
            tarLS.on("close", code => {
                switch (code) {
                    case 0: res([...formatSet]);
                    default: rej(err.join("\n"));
                }
            });
        });
    });
}

export function read(entity: Entity, fileID: bigint, version: number, format: FileFormat) {
    return new Promise<Buffer>((res, rej) => {
        blobDirPromise().then(blobDir => {
            const path = `${blobDir}/${entityName(entity)}/${fileID}.tzst`;
            const tarPath = `${version}/${formatToFileName(format)}`;
            const tarCat = spawn(TAR, [TAR_CAT_PARAMS_BEFORE_FILE, path, TAR_CAT_PARAMS_AFTER_FILE, tarPath]);
            const allData = [];
            tarCat.stdout.on("data", (data: Buffer) => allData.push(data));
            const errData = [];
            tarCat.stderr.on("data", (data: Buffer) => errData.push(data));
            tarCat.on("close", code => {
                switch (code) {
                    case 0: res(Buffer.concat(allData));
                    default: rej(Buffer.concat(errData));
                }
            });
        });
    });
}
export function readLatestVersion(entity: Entity, fileID: bigint, format: FileFormat) {
    return new Promise<Buffer>((res, rej) => {
        allVersions(entity, fileID).then(versions => {
            const sorted = versions.filter(version => version[1] === format).sort();
            if (!sorted || !sorted.length) rej("format not found");
            else {
                const [time,] = sorted[sorted.length - 1];
                read(entity, fileID, time, format).then(res).catch(rej);
            }
        });
    });
}
export function parseHitFile(buffer: Buffer) {
    const words = new Map<bigint, number[]>();
    const bufferLength = buffer.length;
    let offset = 0;
    while (offset < bufferLength) {
        const wordID = buffer.slice(offset, offset + 8).readBigUInt64BE();
        offset += 8;
        const hitsLength = buffer.slice(offset, offset + 2).readUInt16BE();
        offset += 2;
        const hits = new Array(hitsLength);
        for (let i = 0; i < hitsLength; ++i) {
            hits[i] = buffer[offset + i];
        }
        offset += hitsLength;
        words.set(wordID, hits);
    }

    return words;
}

function mvNoReplace(src: string, dst: string) {
    const exists = fs.existsSync(dst);
    if (!exists) fs.renameSync(src, dst);

    return !exists;
}

/*
function main() {
    const find = spawn(FIND, ["/var/newsreduce/incoming", "-type", "f", "-regex", ".*\.tzst"]);
    const allData = [];
    find.stdout.on("data", (data: Buffer) => allData.push(data));
    const errData = [];
    find.stderr.on("data", (data: Buffer) => errData.push(data));
    find.on("close", async code => {
        switch (code) {
            case 0:
                const src = allData.join().split("\n").filter(s => s);
                const pairs = src.map(src => ({
                    src,
                    dst: src.replace(/\/incoming\/[^\/]+\//, "/blobs/"),
                    tmp: src.replace(/\/incoming\/[^\/]+\/([^\/]+)\/([0-9]+).tzst/, "/tmp/$1/$2"),
                }));
                for (const { src, dst, tmp } of pairs.slice(0, 1)) {
                    renewRedis("local").set(`lock-file:${dst}`, "1");
                    const moved = mvNoReplace(src, dst);
                    const varDir = await varDirPromise();
                    const nullDir = `${varDir}/null`;
                    if (!moved) {
                        await safeMkdir(tmp);
                        const tmpTAR = `${tmp}/dst.tar`;
                        const tmpDST = `${tmp}/dst.tzst`;
                        const tmpSRC = `${tmp}/src`;
                        await safeMkdir(tmpSRC);
                        console.log({ src, dst, tmp, tmpTAR, tmpSRC, tmpDST });
                        await new Promise((res, rej) => {
                            spawnSequence([
                                [ZSTD, undefined, ["-df", dst, "-o", tmpTAR]],
                                [TAR, tmpSRC, ["--zstd", "-xvf", src]],
                            ], res, rej);
                        });
                        new Promise((res, rej) => {
                            const update: [string, string, string[]][] =
                                fs.readdirSync(tmpSRC).map(file => [TAR, tmpSRC, ["-uvf", tmpTAR, file]]);
                            spawnSequence([
                                ...update,
                                [ZSTD, undefined, ["-f", tmpTAR, "-o", tmpDST]],
                                [MV, undefined, [tmpDST, dst]],
                                [MV, undefined, [src, `${nullDir}/${Date.now()}-src`]],
                                [MV, undefined, [tmp, `${nullDir}/${Date.now()}-tmp`]],
                            ], res, rej);
                        });
                    }
                }
            default: console.debug(errData.join().toString());
        }
    });
}
*/
