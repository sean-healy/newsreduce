import fs from "fs";
import { varDirPromise } from "./config";

export async function log(...args: any) {
    const now = Date.now();
    const varDir = await varDirPromise();
    const logFile = `${varDir}/log`;
    fs.appendFileSync(logFile, `${now}\t${args.join(" ")}\n`);
}
