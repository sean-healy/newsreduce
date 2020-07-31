import fs from "fs";
import { getVarDir } from "./config";

const TOGGLE = false;

export async function log(...args: any) {
    if (TOGGLE) {
        const now = Date.now();
        const varDir = await getVarDir();
        const logFile = `${varDir}/log`;
        fs.appendFileSync(logFile, `${now}\t${args.join(" ")}\n`);
    }
}
