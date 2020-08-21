import { selectNewsSourceHomepages } from "data";
import { ResourceThrottle } from "types/db-objects/ResourceThrottle";
import { PromisePool } from "common/PromisePool";
import { Redis } from "common/Redis";
import { SQL } from "common/SQL";

export async function main() {
    const pages = await selectNewsSourceHomepages();
    const throttles: ResourceThrottle[] = [];
    for (const resource of pages)
        throttles.push(new ResourceThrottle(resource, 60 * 60 * 1000));
    const pool = new PromisePool(50);
    for (const throttle of throttles)
        await pool.registerPromise(throttle.enqueueInsert({ recursive: true }));
    await pool.flush();
    await Redis.quit();
    await SQL.destroy();
}

main();