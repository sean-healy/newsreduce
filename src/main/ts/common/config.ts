export let ENV: ["prod" | "test"] = ["prod"];

import fs from "fs";
import path from "path";

import { GlobalConfig } from "./GlobalConfig";

export const TAR = "tar";
export const FIND = "find";

export async function getVarDir() {
    let varDir: string;
    const environment = GlobalConfig.softFetch().general.environment;
    switch (environment) {
        case "production":
            varDir = "/var/newsreduce";
            break;
        case "test":
            varDir = "/var/newsreduce/test";
            break;
        default: throw new Error(`env not handled in varDirPromise: ${environment}`);
    }
    await safeMkdir(varDir);

    return varDir;
}
export async function getSafetyFile() {
    const safetyFile = path.join(await getVarDir(), "safety");
    const exists = fs.existsSync(safetyFile);
    if (!exists) fs.writeFileSync(safetyFile, "0");

    return safetyFile;
}

export async function safeMkdir(dir: string) {
    return fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
}

export async function varDirChild(child: string) {
    const dir = path.join(await getVarDir(), child);
    const exists = fs.existsSync(dir);
    if (!exists) await safeMkdir(dir);

    return dir;
}
export function getRawDir() {
    return varDirChild("raw");
}
export function getPreBlobDir() {
    return varDirChild("pre-blobs");
}
export function getNullDir() {
    return varDirChild("null");
}
export function getBlobDir() {
    return varDirChild("blobs");
}
export async function nullFile(path: string) {
    const safePath = path.replace(/[\/.]/g, "_");
    return `${await getNullDir()}/${safePath}-${Date.now()}`;
}