const { popURL } = require("../dist/data");
const { schedule } = require("../dist/data");

test("scheduler should work", async () => {
    await schedule(["https://example.org"]);
    const url = await popURL("example.org");
    expect(url).toBe("https://example.org")
});
