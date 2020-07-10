export let ENV: ["prod" | "test"] = ["prod"];

import fs from "fs";
import path from "path";

export const TAR = "tar";

export async function varDirPromise() {
    const varDir = ENV[0] === "prod" ? "/var/newsreduce" : "/var/newsreduce/test";
    await safeMkdir(varDir);

    return varDir;
}
export async function safetyFilePromise() {
    const safetyFile = path.join(await varDirPromise(), "safety");
    const exists = fs.existsSync(safetyFile);
    if (!exists) fs.writeFileSync(safetyFile, "0");

    return safetyFile;
}

export async function safeMkdir(dir: string) {
    return fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
}

export function varDirChildPromise(child: string) {
    return new Promise<string>(async (res, rej) => {
        const dir = path.join(await varDirPromise(), child);
        const exists = fs.existsSync(dir);
        if (exists) res(dir);
        else fs.mkdir(dir, err => err ? rej(err) : res(dir));
    });
}
export function tmpDirPromise() {
    return varDirChildPromise("tmp");
}
export function nullDirPromise() {
    return varDirChildPromise("null");
}
export function blobDirPromise() {
    return varDirChildPromise("blobs");
}
export async function nullFilePromise(path: string) {
    const safePath = path.replace(/[\/.]/g, "_");
    return `${await nullDirPromise()}/${safePath}-${Date.now()}`;
}
// TODO: fixme
export async function myIP() {
    return '127.0.0.1';
}
