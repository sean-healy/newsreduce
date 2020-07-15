import "./setup.ts";
import { startProcessor } from "common/processor";
import { EVENT_LOG } from "common/events";
import { Redis, REDIS_PARAMS } from "common/Redis";

let called = 0;
/*
 * A function that takes 1s to complete.
 */
function f() {
    ++called;
    return new Promise<void>(res => setTimeout(() => {
        res();
    }, 1000));
}
const BEFORE_EVENT = "test-before3"
const AFTER_EVENT = "test-after3";
const PRE = new Set<string>();
PRE.add(BEFORE_EVENT);
test("standard processor should lock", async () => {
    const trigger = Redis.newRedis(REDIS_PARAMS.events);
    const redisCLI = Redis.newRedis(REDIS_PARAMS.events);
    await new Promise(res => {
        redisCLI.client.subscribe(EVENT_LOG);
        redisCLI.client.on("message", (_, msg) => {
            if (msg === AFTER_EVENT) res(true);
        });
        startProcessor(f, PRE, AFTER_EVENT, { interval: false });
	/*
	 * Trigger the process 0.4s aparts so that the two strands
	 * would be executing with overlap, if locking were not in
	 * place.
	 *       |-------|
	 *   |-------|
	 */
        trigger.publish(EVENT_LOG, BEFORE_EVENT);
        setTimeout(() => trigger.publish(EVENT_LOG, BEFORE_EVENT), 400);
    });

    await new Promise(res => setTimeout(() => res(), 500));
    expect(called).toBe(1);
});
