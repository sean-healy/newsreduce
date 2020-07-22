import "./setup.ts";
import { schedule } from "data";
import { ResourceURL } from "types/objects/ResourceURL";
import { Redis, REDIS_PARAMS } from "common/Redis";

test("scheduler should work", async () => {
    const url = "https://example.org"
    await Redis.renewRedis(REDIS_PARAMS.fetchLock).del(url);
    await schedule([{ id: new ResourceURL(url).getID(), url }]);
    const popped = await ResourceURL.popForFetching("example.org");
    expect(popped.toURL()).toBe(url)
});
