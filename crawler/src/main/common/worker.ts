import { setImmediateInterval } from "./util";
import { renewRedis, newRedis, REDIS_PARAMS } from "./connections";
import { startProcessor } from "./processor";
import { randomBytes } from "crypto";

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

    setImmediateInterval(() => renewRedis(REDIS_PARAMS.local).publish(birthLog, workerID), 400);
    const listen = newRedis(REDIS_PARAMS.local);
    listen.subscribe(workerID);
    listen.on("message", (_, msg) => {
        [lo, hi] = msg.split(" ", 2).map(BigInt);
    });
    startProcessor(async () => f(() => lo, () => hi), preconditions, postcondition);
}
