import "./setup.ts";
import { popURL, schedule } from "data";
import { renewRedis, REDIS_PARAMS } from "common/connections";

test("scheduler should work", async () => {
    const url = "https://example.org"
    await new Promise(res => renewRedis(REDIS_PARAMS.fetchLock).del(url, () => res()));
    await schedule([url]);
    const popped = await popURL("example.org");
    expect(popped).toBe(url)
});
