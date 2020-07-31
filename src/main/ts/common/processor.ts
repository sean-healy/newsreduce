import fs from "fs";
import crypto from "crypto";
import { EVENT_LOG } from "common/events";
import { getSafetyFile } from "common/config";
import { setImmediateInterval, fancyLog } from "common/util";
import { Redis, REDIS_PARAMS, STATIC_CONNECTIONS, SUB_CONNECTIONS } from "./Redis";
import { DB_CLIENT } from "common/SQL";

function dangerouslyExit() {
    fancyLog("Safety procedure activated. Exiting.");
    for (const connection of Object.values(STATIC_CONNECTIONS))
        if (connection && connection.connected)
            connection.quit();
    for (const connection of SUB_CONNECTIONS)
        if (connection && connection.connected)
            connection.quit();
    if (DB_CLIENT) DB_CLIENT.destroy();
    if (INTERVAL) clearInterval(INTERVAL);
    if (SAFETY_INTERVAL) clearInterval(SAFETY_INTERVAL);
}

let LOCKS = {};
async function synchronised(name: string, f: () => Promise<any>, postcondition: string) {
    if (name in LOCKS) return;
    if (SAFELY_EXIT[0]) dangerouslyExit()
    LOCKS[name] = true;
    f().then(() => {
        delete LOCKS[name];
        Redis.renewRedis(REDIS_PARAMS.events).publish(EVENT_LOG, postcondition);
        if (SAFELY_EXIT[0]) dangerouslyExit()
    });
}

let INTERVAL: NodeJS.Timeout = undefined;
let SAFETY_INTERVAL: NodeJS.Timeout = undefined;
export let SAFELY_EXIT = [false];

export function startProcessor(
    f: () => Promise<any>,
    preconditions: Set<string>,
    postcondition: string,
    options: {
        interval?: boolean;
        period?: number;
    } = { interval: true, period: 2000 }
) {
    const name = crypto.randomBytes(30).toString("base64");
    if (options.interval || options.interval === undefined)
        INTERVAL = setImmediateInterval(() => synchronised(name, f, postcondition),
            options.period ? options.period : 2000);
    let events: Redis;
    if (preconditions && preconditions.size > 0) {
        events = Redis.newSub(REDIS_PARAMS.events);
        events.client.subscribe(EVENT_LOG);
        events.client.on("message", (_, msg) => {
            if (preconditions.has(msg))
                synchronised(name, f, postcondition);
        });
    } else events = null;
    SAFETY_INTERVAL = setImmediateInterval(async () => {
        const content = fs.readFileSync(await getSafetyFile()).toString();
        if (content.match(/1/)) SAFELY_EXIT[0] = true;
    }, 1000);
    return { interval: INTERVAL, events };
}

