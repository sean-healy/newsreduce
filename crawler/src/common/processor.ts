import crypto from "crypto";
import { EVENT_LOG } from "../common/events";
import { newRedis, renewRedis, NewRedisTypes } from "../common/connections";
import { varDirPromise } from "./config";
import fs from "fs";
import { setImmediateInterval } from "./util";
import { RedisClient } from "redis";

let locks = {};
async function synchronised(name: string, f: () => Promise<unknown>, postcondition: string) {
    if (name in locks) return;
    locks[name] = true;
    f().then(() => {
        delete locks[name];
        renewRedis("events").publish(EVENT_LOG, postcondition);
    });
}

export function startProcessor(
    f: () => Promise<void>,
    preconditions: Set<string>,
    postcondition: string,
    options: {
        interval?: boolean;
    } = {
            interval: true,
        }
) {
    let safelyExit = false;
    const name = crypto.randomBytes(30).toString("base64");
    let interval: NodeJS.Timeout = undefined;
    if (options.interval || options.interval === undefined)
        interval = setImmediateInterval(() => {
            if (!safelyExit) synchronised(name, f, postcondition);
        }, 2000);
    let events: RedisClient & NewRedisTypes;
    if (!preconditions || !preconditions.size) {
        events = newRedis("events");
        events.subscribe(EVENT_LOG);
        events.on("message", (_, msg) => {
            if (preconditions.has(msg))
                synchronised(name, f, postcondition);
        });
    } else events = null;
    const safetyInterval = setImmediateInterval(async () => {
        const varDir = await varDirPromise();
        const content = fs.readFileSync(`${varDir}/safety`).toString();
        if (content.match(/1/)) {
            safelyExit = true;
            clearInterval(interval);
            clearInterval(safetyInterval);
            if (events) events.quit();
            console.log("Safety procedure activated. Exiting.");
            process.exit();
        }
    }, 1000);
    return { interval, events };
}

