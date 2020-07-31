import crypto from "crypto";
import { Redis, REDIS_PARAMS } from "common/Redis";

test("key not found returns null", async () => {
    const actual = await new Promise<string>(res =>
        Redis.renewRedis(REDIS_PARAMS.local).client.get(crypto.randomBytes(30).toString("base64"), (err, reply) => err ? res(err.toString()) : res(reply)));

    expect(actual).toBe(null);
});
