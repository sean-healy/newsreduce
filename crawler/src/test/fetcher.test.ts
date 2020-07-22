import "./setup";
import { crawlAllowed, throttle, schedule } from "data";
import { fetchAndWrite, pollAndFetch } from "services/fetcher/functions";
import { ResourceURL } from "types/objects/ResourceURL";
import { Redis, REDIS_PARAMS } from "common/Redis";

test("crawl allowed should work", async () => {
    await Redis.renewRedis(REDIS_PARAMS.throttle).del("fakeurl.fake")
    let allowed = (await crawlAllowed("fakeurl.fake"));
    expect(allowed).toBe(true);
    throttle("fakeurl2.fake", 500);
    await new Promise(res => {
        setTimeout(() => {
            res();
        }, 100);
    });
    allowed = (await crawlAllowed("fakeurl2.fake"));
    expect(allowed).toBe(false);
    allowed = await new Promise(res => {
        setTimeout(async () => {
            res(await crawlAllowed("fakeurl2.fake"));
        }, 800);
    });
    expect(allowed).toBe(true);
});
test("fetch and write should work", async () => {
    const url = "https://en.wikipedia.org/wiki/Main_Page";
    await fetchAndWrite(url);
});
test("poll and fetch should work", async () => {
    const url = "https://en.wikipedia.org/wiki/COVID-19_pandemic";
    await Redis.renewRedis(REDIS_PARAMS.fetchLock).del(url)
    await schedule([{ id: new ResourceURL(url).getID(), url }]);
    const resourceURL = new ResourceURL(url);
    const id = resourceURL.host.getID();
    const lo = id;
    const hi = id + 1n;
    const fetched = await pollAndFetch(() => lo, () => hi);
    expect(fetched).toStrictEqual(new Set([url]));
    const locked = await Redis.renewRedis(REDIS_PARAMS.fetchLock).eq(url);
    expect(locked).toBe(true);
});
