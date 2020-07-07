import { crawlAllowed, throttle } from "../dist/data";

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
