import "./setup.ts";
import { db, newRedis, REDIS_PARAMS, renewRedis } from "common/connections";

test("get DB should work", async () => {
    await db();
});

test("get DB should work and cache", async () => {
    const a = await db();
    const b = await db();
    expect(a === b).toBe(true);
});

test("creating redis connections for var IP should work", async () => {
    const client = newRedis("127.0.0.1");
    expect(REDIS_PARAMS["127.0.0.1"]).toStrictEqual({
        host: "127.0.0.1",
        port: 6379,
        db: 0,
        name: "127.0.0.1",
    });

    expect(!client).toBe(false);

    const a = renewRedis("127.0.0.1");
    const b = renewRedis("127.0.0.1");
    expect(a === b).toBe(true);
});
