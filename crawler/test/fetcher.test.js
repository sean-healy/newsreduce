const { crawlAllowed, throttle } = require("../dist/data");

test("crawl allowed should work", async () => {
    let allowed = (await crawlAllowed("fakeurl.fake"));
    expect(allowed).toBe(true);
    throttle("fakeurl2.fake", 500);
    await setTimeout(() => {}, 100);
    allowed = (await crawlAllowed("fakeurl2.fake"));
    expect(allowed).toBe(false);
    await setTimeout(async () => {
	allowed = (await crawlAllowed("fakeurl2.fake"));
	expect(allowed).toBe(true);
    }, 800);
});
