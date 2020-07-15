import "./setup.ts";
import { startProcessor } from "common/processor";
import { EVENT_LOG } from "common/events";
import { Redis, REDIS_PARAMS } from "common/Redis";

function f() {
    return new Promise<void>(res => res());
}
const BEFORE_EVENT = "test-before2"
const AFTER_EVENT = "test-after2";
const PRE = new Set<string>();
PRE.add(BEFORE_EVENT);
test("standard processor should work as expected without interval", async () => {
    const success = await new Promise(res => {
        const redisCLI = Redis.newRedis(REDIS_PARAMS.events);
        redisCLI.client.subscribe(EVENT_LOG);
        redisCLI.client.on("message", (_, msg) => msg === AFTER_EVENT ? res(true) : undefined);
        const { interval } = startProcessor(f, PRE, AFTER_EVENT);
        clearInterval(interval);
        const trigger = Redis.newRedis(REDIS_PARAMS.events);
        setTimeout(() => trigger.publish(EVENT_LOG, BEFORE_EVENT), 100);
    });

    expect(success).toBe(true);
});
