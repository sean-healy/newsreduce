import crypto from "crypto";
import { EVENT_LOG } from "common/events";
import { setImmediateInterval, Dictionary } from "common/util";
import { Redis, REDIS_PARAMS } from "./Redis";
import { SQL } from "common/SQL";
import readline from "readline";
readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

const LOCKS = {};
const INTERVALS: Dictionary<NodeJS.Timeout> = {};
export const GLOBAL_FLAGS = {
    safelyExit: false,
};

async function exit() {
    console.log("Exiting...")
    await Redis.quit();
    console.log("Have quit redis.");
    (await SQL.db()).destroy();
    console.log("Have quit SQL.");

    for (const interval of Object.values(INTERVALS))
        clearInterval(interval);
    console.log("Have cleared intervals.");
    process.stdin.destroy();
}

async function synchronised(name: string, f: () => Promise<any>, postcondition: string) {
    if (!(name in LOCKS)) {
        LOCKS[name] = true;
        f().then(async () => {
            if (postcondition)
                await Redis.renewRedis(REDIS_PARAMS.events).publish(EVENT_LOG, postcondition);
            if (GLOBAL_FLAGS.safelyExit) await exit();
            else delete LOCKS[name];
        });
    }
}

process.stdin.on('keypress', (str, key) => {
    switch (str) {
        case "q":
            console.log("Exiting.")
            GLOBAL_FLAGS.safelyExit = true;
            break;
        case "c":
            if (GLOBAL_FLAGS.safelyExit) {
                console.log("Cancel exit.")
                GLOBAL_FLAGS.safelyExit = false;
            }
            break;
    }
})

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
        INTERVALS[name] = setImmediateInterval(() => synchronised(name, f, postcondition),
            options.period ? options.period : 2000);
    if (preconditions && preconditions.size > 0) {
        const events = Redis.newSub(REDIS_PARAMS.events);
        events.client.subscribe(EVENT_LOG);
        events.client.on("message", (_, msg) => {
            if (preconditions.has(msg))
                synchronised(name, f, postcondition);
        });
    }
}

