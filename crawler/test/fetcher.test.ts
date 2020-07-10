import "./setup";
import { crawlAllowed, throttle, schedule } from "data";
import { fetchAndWrite, pollAndFetch } from "services/fetcher/functions";
import { ResourceURL } from "types/objects/ResourceURL";
import { renewRedis, REDIS_PARAMS } from "common/connections";
import { STR_ONE } from "common/util";

test("crawl allowed should work", async () => {
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
    await new Promise(res => renewRedis(REDIS_PARAMS.fetchLock).del(url, () => res()));
    await schedule([url]);
    const resourceURL = new ResourceURL(url);
    const id = resourceURL.host.getID();
    const lo = id;
    const hi = id + 1n;
    const fetched = await pollAndFetch(() => lo, () => hi);
    expect(fetched).toStrictEqual(new Set([url]));
    const locked = await new Promise<boolean>((res, rej) =>
        renewRedis(REDIS_PARAMS.fetchLock).get(url, (err, response) =>
            err ? rej(err) : res(response === STR_ONE)));
    expect(locked).toBe(true);
});
