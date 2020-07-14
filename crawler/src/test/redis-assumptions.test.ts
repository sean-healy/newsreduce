import { renewRedis, REDIS_PARAMS } from "common/connections";
import crypto from "crypto";

test("key not found returns null", async () => {
    const actual = await new Promise<string>(res =>
        renewRedis(REDIS_PARAMS.local).get(crypto.randomBytes(30).toString("base64"), (err, reply) => err ? res(err.toString()) : res(reply)));

    expect(actual).toBe(null);
});
