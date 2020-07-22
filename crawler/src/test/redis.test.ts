import "./setup.ts";
import { Redis, REDIS_PARAMS } from "common/Redis";

test("redis communication possible", async () => {
    for (const key of Object.keys(REDIS_PARAMS)) {
        const redisCLI = Redis.renewRedis(key);
        const response = await new Promise<string>(async res => {
            await redisCLI.set("test", "1");
            const response = await redisCLI.get("test");
            await redisCLI.del("test");
            res(response);
        }).catch(err => {
            console.debug(err);
            return null;
        });
        expect(response).toBe("1");
    }
});
