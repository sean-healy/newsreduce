import "./setup.ts";
import { newRedis } from "common/connections";
import { startProcessor } from "common/processor";
import { EVENT_LOG } from "common/events";

function f() {
    return new Promise<void>(res => res());
}
const BEFORE_EVENT = "test-before2"
const AFTER_EVENT = "test-after2";
const PRE = new Set<string>();
PRE.add(BEFORE_EVENT);
test("standard processor should work as expected without interval", async () => {
    const success = await new Promise(res => {
        const redisCLI = newRedis("events");
        redisCLI.subscribe(EVENT_LOG);
        redisCLI.on("message", (_, msg) => msg === AFTER_EVENT ? res(true) : undefined);
        const { interval } = startProcessor(f, PRE, AFTER_EVENT);
        clearInterval(interval);
        const trigger = newRedis("events");
        setTimeout(() => trigger.publish(EVENT_LOG, BEFORE_EVENT), 100);
    });

    expect(success).toBe(true);
});
