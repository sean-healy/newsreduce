const { REDIS_PARAMS, newRedis } = require("../dist/common/connections");
const { startProcessor } = require("../dist/common/processor");
const { EVENT_LOG } = require("../dist/common/events");

function f() {
    return new Promise((res, rej) => {
	res();
    });
}
const BEFORE_EVENT = "test-before"
const AFTER_EVENT = "test-after";
const PRE = new Set();
PRE.add(BEFORE_EVENT);
test("standard processor should work as expected without interval", async () => {
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
    });

    expect(success).toBe(true);
});
