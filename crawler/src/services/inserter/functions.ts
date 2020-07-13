import { renewRedis, REDIS_PARAMS } from "common/connections";
import { getRedisKeys } from "data";
import { DBObject } from "types/DBObject";

export async function bulkInsert() {
    const keys = await getRedisKeys(REDIS_PARAMS.inserts);
    const client = renewRedis(REDIS_PARAMS.inserts);
    for (const key of keys) {
        console.log(key);
        const type = await new Promise<string>((res, rej) =>
            client.type(key, (err, response) =>
                err ? rej(err) : res(response)));
        const table = DBObject.forTable(key);
        let deleteFn: typeof client.srem;
        let listFn: typeof client.smembers;
        let preMapper: (response: any) => string[];
        let postMapper: (row: string, response: any) => string;
        [listFn, preMapper, postMapper, deleteFn] = {
            hash: [client.hgetall.bind(client), Object.keys, (row, response) => response[row], client.hdel.bind(client)],
            set: [client.smembers.bind(client), r => r, (row, _) => row, client.srem.bind(client)]
        }[type];
        const [params, toRemove] = await new Promise((res, rej) => {
            listFn(key, async (err, response) => {
                if (err) rej(err);
                else {
                    const toRemove = preMapper(response).slice(0, 1000);
                    const params: any[][] = toRemove.map(row => {
                        const paramsStr = postMapper(row, response)
                        const parsed = JSON.parse(paramsStr);

                        return parsed;
                    });
                    res([params, toRemove]);
                }
            });
        });
        await table.bulkInsert(params);
        await new Promise<void>((res, rej) => deleteFn(key, toRemove, err => err ? rej(err) : res()));
    }
}
