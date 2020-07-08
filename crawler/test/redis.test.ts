import { REDIS_PARAMS, newRedis } from "common/connections";

test("redis communication possible", async () => {
    for (const key of Object.keys(REDIS_PARAMS)) {
        const redisCLI = newRedis(key);
        const response = await new Promise((res, rej) => {
            redisCLI.set("test", "1", (err, response) => {
                if (err || response !== "OK") {
                    console.debug(err);
                    console.debug(response);
                    rej(err);
                } else {
                    redisCLI.get("test", (err, response) => {
                        if (err) rej(err);
                        else redisCLI.del("test", err => {
                            if (err) rej(err);
                            else {
                                res(response);
                                redisCLI.quit();
                            }
                        });
                    });
                }
            });
        });
        expect(response).toBe("1");
    }
});
