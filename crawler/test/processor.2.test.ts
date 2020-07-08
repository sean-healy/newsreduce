import { newRedis } from "common/connections";
import { startProcessor } from "common/processor";
import { EVENT_LOG } from "common/events";

function f() {
    return new Promise<void>(res => res());
}
const BEFORE_EVENT = "test-before"
const AFTER_EVENT = "test-after";
const PRE = new Set<string>();
PRE.add(BEFORE_EVENT);
test("standard processor should work as expected without interval", async () => {
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
        const { interval, events } = startProcessor(f, PRE, AFTER_EVENT);
        clearInterval(interval);
        const trigger = newRedis("events");
        setTimeout(() => trigger.publish(EVENT_LOG, BEFORE_EVENT), 100);
    });

    expect(success).toBe(true);
});
