import fs from "fs";
import crypto from "crypto";
import { EVENT_LOG } from "common/events";
import { safetyFilePromise } from "common/config";
import { setImmediateInterval, fancyLog } from "common/util";
import { Redis, REDIS_PARAMS } from "./Redis";

let locks = {};
async function synchronised(name: string, f: () => Promise<any>, postcondition: string) {
    if (name in locks) return;
    locks[name] = true;
    f().then(() => {
        delete locks[name];
        Redis.renewRedis(REDIS_PARAMS.events).publish(EVENT_LOG, postcondition);
    });
}

export function startProcessor(
    f: () => Promise<any>,
    preconditions: Set<string>,
    postcondition: string,
    options: {
        interval?: boolean;
        period?: number;
    } = { interval: true, period: 2000 }
) {
    let safelyExit = false;
    const name = crypto.randomBytes(30).toString("base64");
    let interval: NodeJS.Timeout = undefined;
    if (options.interval || options.interval === undefined)
        interval = setImmediateInterval(() => {
            if (!safelyExit) synchronised(name, f, postcondition);
        }, options.period ? options.period : 2000);
    let events: Redis;
    if (preconditions && preconditions.size > 0) {
        events = Redis.newRedis(REDIS_PARAMS.events);
        events.client.subscribe(EVENT_LOG);
        events.client.on("message", (_, msg) => {
            if (preconditions.has(msg))
                synchronised(name, f, postcondition);
        });
    } else events = null;
    const safetyInterval = setImmediateInterval(async () => {
        const content = fs.readFileSync(await safetyFilePromise()).toString();
        if (content.match(/1/)) {
            safelyExit = true;
            clearInterval(interval);
            clearInterval(safetyInterval);
            if (events) events.client.quit();
            fancyLog("Safety procedure activated. Exiting.");
            process.exit();
        }
    }, 1000);
    return { interval, events };
}

