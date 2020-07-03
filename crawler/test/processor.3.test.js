const { REDIS_PARAMS, newRedis } = require("../dist/common/connections");
const { startProcessor } = require("../dist/common/processor");
const { EVENT_LOG } = require("../dist/common/events");

let called = 0;
function f() {
    ++called;
    return new Promise((res, rej) => {
	setTimeout(() => {
	    res();
	}, 200);
    });
}
const BEFORE_EVENT = "test-before"
const AFTER_EVENT = "test-after";
const PRE = new Set();
PRE.add(BEFORE_EVENT);
test("standard processor should lock", async () => {
    const success = await new Promise((res, rej) => {
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
	setTimeout(() => trigger.publish(EVENT_LOG, BEFORE_EVENT), 200);
    });

    await new Promise(res => setTimeout(() => res(), 300));
    expect(called).toBe(1);
});
