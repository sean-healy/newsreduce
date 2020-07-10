import fs from "fs";
import crypto from "crypto";
import { RedisClient } from "redis";
import { EVENT_LOG } from "common/events";
import { newRedis, renewRedis, ExtendedRedisClient, REDIS_PARAMS } from "common/connections";
import { safetyFilePromise } from "common/config";
import { setImmediateInterval } from "common/util";

let locks = {};
async function synchronised(name: string, f: () => Promise<any>, postcondition: string) {
    if (name in locks) return;
    locks[name] = true;
    f().then(() => {
        delete locks[name];
        renewRedis(REDIS_PARAMS.events).publish(EVENT_LOG, postcondition);
    });
}

export function startProcessor(
    f: () => Promise<any>,
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
    let events: RedisClient & ExtendedRedisClient;
    if (preconditions && preconditions.size > 0) {
        events = newRedis(REDIS_PARAMS.events);
        events.subscribe(EVENT_LOG);
        events.on("message", (_, msg) => {
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
            if (events) events.quit();
            console.log("Safety procedure activated. Exiting.");
            process.exit();
        }
    }, 1000);
    return { interval, events };
}

