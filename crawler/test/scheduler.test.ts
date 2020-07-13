import "./setup.ts";
import { schedule } from "data";
import { renewRedis, REDIS_PARAMS } from "common/connections";
import { ResourceURL } from "types/objects/ResourceURL";

test("scheduler should work", async () => {
    const url = "https://example.org"
    await new Promise(res => renewRedis(REDIS_PARAMS.fetchLock).del(url, () => res()));
    await schedule([url]);
    const popped = await ResourceURL.popForFetching("example.org");
    expect(popped.toURL()).toBe(url)
});
