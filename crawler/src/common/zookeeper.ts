import { newRedis, renewRedis } from "../common/connections"

const ZERO = BigInt(0);
const ONE = BigInt(1)

export function start(birthLog: string, deathLog: string, idBytes: number) {
    const MAX_ID = (ONE << BigInt(8 * idBytes));
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
            renewRedis("local").publish(id, `${lo} ${hi}`);
            lo += idsPerWorker;
        }
    }
    const birthsSub = newRedis("local");
    birthsSub.subscribe(birthLog);
    birthsSub.on("message", (_, id) => sourceWorker(id));
    const deathsSub = newRedis("local");
    deathsSub.subscribe(deathLog);
    deathsSub.on("message", (_, id) => retireWorker(id));

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
