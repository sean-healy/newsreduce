export let ENV: ["prod" | "test"] = ["prod"];

import fs from "fs";
import path from "path";
import fetch from "node-fetch";

import { DNS } from "common/DNS";

export const LOCALHOST = DNS.ipv4AsIpv6("127.0.0.1");
export const MAIN_HOSTNAME = "newsreduce.org";

export const TAR = "tar";
export const FIND = "find";

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
export async function myIP() {
    const ip = await fetch("http://newsreduce.org:9999/ip").then(response => response.text());

    return ip;
}


const NET_AGENT_ENDPOINT = `http://${MAIN_HOSTNAME}:9999`;

interface Params {
    sql: string;
}
let params: Params = null;
export async function getParams() {
    if (!params) params = await fetch(NET_AGENT_ENDPOINT).then(res => res.json());

    return params;
}
