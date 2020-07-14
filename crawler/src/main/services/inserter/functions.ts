import { renewRedis, REDIS_PARAMS } from "common/connections";
import { getRedisKeys } from "data";
import { DBObject } from "types/DBObject";

const BATCH_SIZE = 5000;

export async function bulkInsert() {
    const keys = await getRedisKeys(REDIS_PARAMS.inserts);
    const client = renewRedis(REDIS_PARAMS.inserts);
    let start = Date.now();
    const promises = new Array<Promise<void>>(keys.length);
    for (const key of keys) {
        console.log(key);
        const typePromise = new Promise<string>((res, rej) =>
            client.type(key, (err, response) =>
                err ? rej(err) : res(response)));
        const table = DBObject.forTable(key);
        let deleteFn: typeof client.srem;
        let listFn: typeof client.smembers;
        let preMapper: (response: any) => string[];
        let postMapper: (row: string, response: any) => string;
        promises.push(typePromise.then(async type => {
            [listFn, preMapper, postMapper, deleteFn] = {
                hash: [client.hgetall.bind(client), Object.keys, (row, response) => response[row], client.hdel.bind(client)],
                set: [(key, cb) => client.srandmember(key, BATCH_SIZE, cb), r => r, (row, _) => row, client.srem.bind(client)]
            }[type];
            const [params, toRemove] = await new Promise((res, rej) => {
                listFn(key, async (err, response) => {
                    if (err) rej(err);
                    else {
                        const toRemove = preMapper(response).slice(0, BATCH_SIZE);
                        const params: any[][] = toRemove.map(row => {
                            const paramsStr = postMapper(row, response)
                            const parsed = JSON.parse(paramsStr);

                            return parsed;
                        });
                        res([params, toRemove]);
                    }
                });
            });
            await Promise.all([
                table.bulkInsert(params),
                new Promise<void>((res, rej) => deleteFn(key, toRemove, err => err ? rej(err) : res()))
            ]);
        }));
    }
    await Promise.all(promises);
    let end = Date.now();
    console.log(`${(end - start)} ms`);
}
