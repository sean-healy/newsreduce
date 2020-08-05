import "./setup.ts";
import { schedule } from "data";
import { ResourceURL } from "types/db-objects/ResourceURL";
import { Redis, REDIS_PARAMS } from "common/Redis";
import { Host } from "types/db-objects/Host";

test("scheduler should work", async () => {
    const url = "https://example.org"
    await Redis.renewRedis(REDIS_PARAMS.fetchLock).del(url);
    await schedule([{ id: new ResourceURL(url).getID(), url }]);
    const popped = await new Host("example.org").popURLForFetching();
    expect(popped).toBe(url)
});
