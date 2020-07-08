import { popURL, schedule } from "data";

test("scheduler should work", async () => {
    await schedule(["https://example.org"]);
    const url = await popURL("example.org");
    expect(url).toBe("https://example.org")
});
