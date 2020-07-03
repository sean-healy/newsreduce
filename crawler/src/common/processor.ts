import crypto from "crypto";
import { EVENT_LOG } from "../common/events";
import { newRedis, renewRedis, NewRedisTypes } from "../common/connections";
import { varDirPromise } from "./config";
import fs from "fs";

let locks = {};
async function synchronised(name: string, f: () => Promise<unknown>, postcondition: string) {
    if (name in locks) return;
    locks[name] = true;
    f().then(() => {
        delete locks[name];
        renewRedis("events").publish(EVENT_LOG, postcondition);
    });
}

export function startProcessor(f: () => Promise<void>, preconditions: Set<string>, postcondition: string) {
    let safelyExit = false;
    const name = crypto.randomBytes(30).toString("base64");
    const interval = setInterval(() => {
        if (!safelyExit) synchronised(name, f, postcondition);
    }, 2000);
    const events = newRedis("events");
    events.subscribe(EVENT_LOG);
    events.on("message", (_, msg) => {
        if (preconditions.has(msg))
            synchronised(name, f, postcondition);
    });
    const safetyInterval = setInterval(async () => {
        const varDir = await varDirPromise();
        const content = fs.readFileSync(`${varDir}/safety`).toString();
        if (content.match(/1/)) {
            safelyExit = true;
            clearInterval(interval);
            clearInterval(safetyInterval);
            events.quit();
            console.log("Safety procedure activated. Exiting.");
            process.exit();
        }
    }, 1000);
    return { interval, events };
}

