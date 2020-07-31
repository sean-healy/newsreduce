import { DNS } from "common/DNS";

test("DNS module should work", async () => {
    const myIP = await DNS.whoami();
    const mainIP = await DNS.lookup("newsreduce.org");
    const mainIP2 = await DNS.lookup("::ffff:178.63.79.76");
    expect(!!myIP.match(/^[a-f0-9.:]+$/)).toBe(true);
    expect(mainIP).toBe("::ffff:178.63.79.76")
    expect(mainIP2).toBe("::ffff:178.63.79.76")
});
