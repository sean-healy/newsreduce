import "./setup.ts";
import { startProcessor } from "common/processor";
import { EVENT_LOG } from "common/events";
import { Redis, REDIS_PARAMS } from "common/Redis";

function f() {
    return new Promise<void>(res => res());
}
const BEFORE_EVENT = "test-before1"
const AFTER_EVENT = "test-after1";
const PRE = new Set<string>();
PRE.add(BEFORE_EVENT);
test("standard processor should work as expected", async () => {
    const success = await new Promise(res => {
        const redisCLI = Redis.newRedis(REDIS_PARAMS.events);
        redisCLI.client.subscribe(EVENT_LOG);
        redisCLI.client.on("message", (_, msg) => {
            if (msg === AFTER_EVENT) {
                clearInterval(interval);
                res(true);
            }
        });
        const { interval } = startProcessor(f, PRE, AFTER_EVENT);
    });

    expect(success).toBe(true);
});
