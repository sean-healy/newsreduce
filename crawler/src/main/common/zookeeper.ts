import { Redis, REDIS_PARAMS } from "./Redis";
import { log } from "./logging";

const ZERO = BigInt(0);
const ONE = BigInt(1)

export function start(birthLog: string, deathLog: string, idBytes: number) {
    const MAX_ID = (ONE << BigInt(12 * idBytes));
    let dob = new Map<string, number>();

    function sourceWorker(id: string) {
        const old = dob.has(id);
        dob.set(id, Date.now());
        if (!old) console.log(`new worker: ${id}`);
        reAssemble();
    }
    function retireWorker(id: string) {
        console.log(`retire worker ${id}`);
        dob.delete(id);
        reAssemble();
    }
    function retireWorkers(ids: string[]) {
        console.log(`retire workers: ${JSON.stringify(ids)}`);
        for (const id of ids) dob.delete(id);
        reAssemble();
    }
    function reAssemble() {
        if (dob.size === 0) return;
        const idsPerWorker = MAX_ID / BigInt(dob.size);
        let lo = ZERO;
        for (const [id,] of dob) {
            let hi = lo + idsPerWorker;
            if (hi + idsPerWorker > MAX_ID) hi = MAX_ID;
            Redis.renewRedis(REDIS_PARAMS.local).publish(id, `${lo} ${hi}`);
            lo += idsPerWorker;
        }
    }
    const birthsSub = Redis.newRedis(REDIS_PARAMS.local);
    birthsSub.client.subscribe(birthLog);
    birthsSub.client.on("message", (_, id) => sourceWorker(id));
    birthsSub.client.on("error", (_, msg) => {
        log(msg);
        console.debug(msg);
    });
    const deathsSub = Redis.newRedis(REDIS_PARAMS.local);
    deathsSub.client.subscribe(deathLog);
    deathsSub.client.on("message", (_, id) => retireWorker(id));
    deathsSub.client.on("error", (_, msg) => {
        log(msg);
        console.debug(msg);
    });

    setInterval(() => {
        const now = Date.now();
        const toRetire = [];
        for (const [id, lastCheckup] of dob)
            if (now - lastCheckup > 1000) toRetire.push(id);
        if (toRetire.length !== 0)
            retireWorkers(toRetire);
    }, 1000);
    console.log(`Zookeeper started watching events for ${birthLog} and ${deathLog}`);
}
