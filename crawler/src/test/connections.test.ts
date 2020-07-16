import "./setup.ts";
import { Redis, REDIS_PARAMS } from "common/Redis";
import { SQL } from "common/SQL";

test("get DB should work", async () => {
    await SQL.db();
});

test("get DB should work and cache", async () => {
    const a = await SQL.db();
    const b = await SQL.db();
    expect(a === b).toBe(true);
});

test("DB functioning", async () => {
    const rows = await SQL.query("select 1 as one", []);
    expect(rows[0].one).toBe(1);
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
