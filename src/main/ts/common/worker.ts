import { setImmediateInterval } from "../utils/alpha";
import { startProcessor, GLOBAL_VARS } from "./processor";
import { randomBytes } from "crypto";
import { Redis, REDIS_PARAMS } from "./Redis";

export function start(
    f: (lo: () => bigint, hi: () => bigint) => void,
    birthLog: string,
    deathLog: string,
    preconditions: Set<string>,
    postcondition: string,
) {
    const workerID = randomBytes(30).toString("hex");
    let lo: bigint;
    let hi: bigint;

    GLOBAL_VARS.intervals[workerID] =
        setImmediateInterval(() =>
            Redis.renewRedis(REDIS_PARAMS.local).publish(birthLog, workerID), 400);
    const listen = Redis.newSub(REDIS_PARAMS.local);
    listen.client.subscribe(workerID);
    listen.client.on("message", (_, msg) => {
        [lo, hi] = msg.split(" ", 2).map(BigInt);
    });
    startProcessor(async () => f(() => lo, () => hi), preconditions, postcondition);
}
