import crypto from "crypto";
import { EVENT_LOG } from "common/events";
import { setImmediateInterval, Dictionary } from "common/util";
import { Redis, REDIS_PARAMS } from "./Redis";
import { SQL } from "common/SQL";
import readline from "readline";

const LOCKS = {};
export const GLOBAL_VARS = {
    safelyExit: false,
    intervals: {} as Dictionary<NodeJS.Timeout>,
};

export async function exit() {
    console.log("Exiting...")
    await Redis.quit();
    console.log("Have quit redis.");
    (await SQL.db()).destroy();
    console.log("Have quit SQL.");

    for (const interval of Object.values(GLOBAL_VARS.intervals))
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
            if (GLOBAL_VARS.safelyExit) await exit();
            else delete LOCKS[name];
        });
    }
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
    readline.emitKeypressEvents(process.stdin);
    if ("setRawMode" in process.stdin)
        process.stdin.setRawMode(true);
    process.stdin.on('keypress', (str, key) => {
        switch (str) {
            case "q":
                console.log("Exiting.")
                GLOBAL_VARS.safelyExit = true;
                break;
            case "c":
                if (GLOBAL_VARS.safelyExit) {
                    console.log("Cancel exit.")
                    GLOBAL_VARS.safelyExit = false;
                }
                break;
        }
    });

    process.once('SIGUSR2', () => {
        GLOBAL_VARS.safelyExit = true;
    });

    const name = crypto.randomBytes(30).toString("base64");
    if (options.interval || options.interval === undefined)
        GLOBAL_VARS.intervals[name] = setImmediateInterval(() => synchronised(name, f, postcondition),
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

