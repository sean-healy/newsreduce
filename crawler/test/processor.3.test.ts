import { newRedis } from "common/connections";
import { startProcessor } from "common/processor";
import { EVENT_LOG } from "common/events";
import { log } from "common/logging";

let called = 0;
function f() {
    ++called;
    return new Promise<void>(res => setTimeout(() => {
        log("here");
        res();
    }, 1000));
}
const BEFORE_EVENT = "test-before"
const AFTER_EVENT = "test-after";
const PRE = new Set<string>();
PRE.add(BEFORE_EVENT);
test("standard processor should lock", async () => {
    const success = await new Promise(res => {
        const redisCLI = newRedis("events");
        redisCLI.subscribe(EVENT_LOG);
        redisCLI.on("message", (_, msg) => {
            if (msg === AFTER_EVENT) {
                redisCLI.quit();
                trigger.quit();
                res(true);
            }
        });
        startProcessor(f, PRE, AFTER_EVENT, { interval: false });
        const trigger = newRedis("events");
        trigger.publish(EVENT_LOG, BEFORE_EVENT);
        setTimeout(() => trigger.publish(EVENT_LOG, BEFORE_EVENT), 200);
    });

    await new Promise(res => setTimeout(() => res(), 300));
    expect(called).toBe(1);
});
