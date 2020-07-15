import "./setup.ts";
import { db } from "common/connections";
import { Redis, REDIS_PARAMS } from "common/Redis";

test("get DB should work", async () => {
    await db();
});

test("get DB should work and cache", async () => {
    const a = await db();
    const b = await db();
    expect(a === b).toBe(true);
});

test("creating redis connections for var IP should work", async () => {
    const client = Redis.newRedis("127.0.0.1");
    expect(REDIS_PARAMS["127.0.0.1"]).toStrictEqual({
        host: "127.0.0.1",
        port: 6379,
        db: 0,
        name: "127.0.0.1",
    });

    expect(!client).toBe(false);

    const a = Redis.renewRedis("127.0.0.1");
    const b = Redis.renewRedis("127.0.0.1");
    expect(a.client === b.client).toBe(true);
});
