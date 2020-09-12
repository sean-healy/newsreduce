import redis, { RedisClient } from "redis";
import { STR_ONE, fancyLog } from "../utils/alpha";
import { log } from "./logging";
import { GlobalConfig } from "./GlobalConfig";
import { DNS } from "./DNS";
import { PromisePool } from "./PromisePool";

const DEFAULT_REDIS_DB = 0;

const { host: MAIN_HOST, port: DEFAULT_REDIS_PORT } = GlobalConfig.softFetch().mainRedis;

export interface RedisParamsValueType {
    host: string;
    port: number;
    db: number;
    name: string;
}
export const REDIS_PARAMS = {
    local: {
        host: DNS.LOCALHOST,
        port: DEFAULT_REDIS_PORT,
        db: DEFAULT_REDIS_DB,
    } as RedisParamsValueType,
    events: {
        host: MAIN_HOST,
        port: DEFAULT_REDIS_PORT,
        db: DEFAULT_REDIS_DB,
    } as RedisParamsValueType,
    fetchSchedule: {
        host: MAIN_HOST,
        port: DEFAULT_REDIS_PORT,
        db: 1,
    } as RedisParamsValueType,
    general: {
        host: MAIN_HOST,
        port: DEFAULT_REDIS_PORT,
        db: 2,
    } as RedisParamsValueType,
    throttle: {
        host: MAIN_HOST,
        port: DEFAULT_REDIS_PORT,
        db: 3,
    } as RedisParamsValueType,
    inserts: {
        host: MAIN_HOST,
        port: DEFAULT_REDIS_PORT,
        db: 4,
    } as RedisParamsValueType,
    fetchLock: {
        host: MAIN_HOST,
        port: DEFAULT_REDIS_PORT,
        db: 6,
    } as RedisParamsValueType,
    services: {
        host: MAIN_HOST,
        port: DEFAULT_REDIS_PORT,
        db: 7,
    } as RedisParamsValueType,
};
for (const key in REDIS_PARAMS) REDIS_PARAMS[key].name = key;

export interface ExtendedRedisClient extends RedisClient {
    zpopmax(args: [string, number], cb: (err: any, response: string[]) => void):
        any;
}

export const STATIC_CONNECTIONS: { [key: string]: ExtendedRedisClient } = {};
export const SUB_CONNECTIONS: ExtendedRedisClient[] = [];

/*
 * A proxy for the redis client, which survives all sorts of
 * errors from client resets.
 */
export class Redis {
    readonly params: RedisParamsValueType;
    client: ExtendedRedisClient;

    private constructor(
        params: RedisParamsValueType,
        client: ExtendedRedisClient
    ) {
        this.params = params;
        this.client = client;
    }

    async tryLoop<T>(
        cb: (res: (response?: T) => void, rej: (reason?: any) => void) => void
    ) {
        for (let attempt = 0; attempt < 10; ++attempt) {
            try {
                const response = await new Promise<T>(cb);

                return response;
            } catch (err) {
                log("error on attempt", attempt.toString());
                log(err);
                fancyLog(JSON.stringify(err));
                const oldClient = STATIC_CONNECTIONS[this.params.name];
                delete STATIC_CONNECTIONS[this.params.name];
                if (oldClient) oldClient.quit();
                this.client = Redis.renewRedis(this.params).client;
            }
        }

        return null;
    }

    async zincrby(key: string, increment: number, member: string) {
        const response: void = await this.tryLoop((res, rej) =>
            this.client.zincrby(key, increment, member, err =>
                err ? rej(err) : res()));

        return response;
    }

    async zadd(key: string, score: number, member: string) {
        const response: void = await this.tryLoop((res, rej) =>
            this.client.zadd(key, score, member, err =>
                err ? rej(err) : res()));

        return response;
    }

    async zpopmaxN(key: string, count: number) {
        const response: string[] = await this.tryLoop((res, rej) =>
            this.client.zpopmax([key, count], (err, response) =>
                err ? rej(err) : res(response)));

        return response;
    }

    async zpopmax(key: string, count: number) {
        const response: string = await this.tryLoop((res, rej) =>
            this.client.zpopmax([key, count], (err, response) =>
                err ? rej(err) : res(!response || response.length === 0 ? null : response[0])));

        return response;
    }

    async spop(key: string) {
        const response: string = await this.tryLoop((res, rej) =>
            this.client.spop(key, (err, response) =>
                err ? rej(err) : res(response)));

        return response;
    }

    async srem(key: string, member: string | string[]) {
        const response: void = await this.tryLoop((res, rej) =>
            this.client.srem(key, member, err =>
                err ? rej(err) : res()));

        return response;
    }

    async hdel(key: string, member: string) {
        const response: void = await this.tryLoop((res, rej) =>
            this.client.hdel(key, member, err =>
                err ? rej(err) : res()));

        return response;
    }

    async smembers(key: string) {
        const response: string[] = await this.tryLoop((res, rej) =>
            this.client.smembers(key, (err, members) =>
                err ? rej(err) : res(members)));

        return response;
    }

    async hgetall(key: string) {
        const response: { [key: string]: string } = await this.tryLoop((res, rej) =>
            this.client.hgetall(key, (err, members) =>
                err ? rej(err) : res(members)));

        return response;
    }

    async type(key: string) {
        const response: string = await this.tryLoop((res, rej) =>
            this.client.type(key, (err, type) =>
                err ? rej(err) : res(type)));

        return response;
    }

    async srandmember(key: string, batch: number) {
        const response: string[] = await this.tryLoop((res, rej) =>
            this.client.srandmember(key, batch, (err, members) =>
                err ? rej(err) : res(members)));

        return response;
    }

    async setex(key: string, seconds: number = 60, value: string = STR_ONE) {
        const response: void = await this.tryLoop((res, rej) =>
            this.client.setex(key, seconds, value, err =>
                err ? rej(err) : res()));

        return response;
    }

    async set(key: string, value: string = STR_ONE) {
        const response: void = await this.tryLoop((res, rej) =>
            this.client.set(key, value, err =>
                err ? rej(err) : res()));

        return response;
    }

    async setpx(key: string, ms: number = 1050, value: string = STR_ONE) {
        const response: void = await this.tryLoop((res, rej) =>
            this.client.set(key, value, "PX", ms, err =>
                err ? rej(err) : res()));

        return response;
    }

    async sadd(key: string, member: string | string[]) {
        const response: void = await this.tryLoop((res, rej) =>
            this.client.sadd(key, member, err =>
                err ? rej(err) : res()));

        return response;
    }

    async sismember(key: string, member: string) {
        const response: boolean = await this.tryLoop((res, rej) =>
            this.client.sismember(key, member, (err, exists) =>
                err ? rej(err) : res(!!exists)));

        return response;
    }

    async get(key: string) {
        const response: string = await this.tryLoop((res, rej) =>
            this.client.get(key, (err, response) =>
                err ? rej(err) : res(response)));

        return response;
    }

    async del(key: string) {
        const response: void = await this.tryLoop((res, rej) =>
            this.client.del(key, err =>
                err ? rej(err) : res()));

        return response;
    }

    async keys(pattern: string = "*") {
        const response: string[] = await this.tryLoop((res, rej) =>
            this.client.keys(pattern, (err, keys) =>
                err ? rej(err) : res(keys)));

        return response;
    }

    async hset(key: string, field: string, value: string) {
        const response: void = await this.tryLoop((res, rej) =>
            this.client.hset(key, field, value, err =>
                err ? rej(err) : res()));

        return response;
    }

    async eq(key: string, value: string = STR_ONE) {
        const response: boolean = await this.tryLoop((res, rej) =>
            this.client.get(key, (err, response) =>
                err ? rej(err) : res(response === value)));

        return response;
    }

    async publish(channel: string, msg: string) {
        const response: number = await this.tryLoop((res, rej) =>
            this.client.publish(channel, msg, (err, response) =>
                err ? rej(err) : res(response)));

        return response;
    }

    static getName(paramsOrHost: RedisParamsValueType | string) {
        return (typeof paramsOrHost === "string") ?
            paramsOrHost : paramsOrHost.name;
    }
    static computeParams(paramsOrHost: RedisParamsValueType | string) {
        const name: string = Redis.getName(paramsOrHost);
        let params: RedisParamsValueType = REDIS_PARAMS[name];
        if (!params) {
            params = Redis.defaultHostParams(paramsOrHost as string);
            REDIS_PARAMS[name] = params;
        }

        return params;
    }
    static renewRedis(paramsOrHost: RedisParamsValueType | string) {
        const params = this.computeParams(paramsOrHost);
        let client = STATIC_CONNECTIONS[params.name];
        let redis: Redis;
        if (!client) {
            redis = Redis.newRedis(params);
            STATIC_CONNECTIONS[params.name] = redis.client;
        } else {
            redis = new Redis(params, client);
        }

        return redis;
    }
    static defaultHostParams = (host: string) => ({
        host,
        name: host,
        port: DEFAULT_REDIS_PORT,
        db: DEFAULT_REDIS_DB,
    });
    static newRedis(paramsOrHost: RedisParamsValueType | string) {
        const params = this.computeParams(paramsOrHost);
        const env = GlobalConfig.softFetch().general.environment;
        const client = redis.createClient({
            host: env === "production" ? params.host : DNS.LOCALHOST,
            port: env === "production" ? params.port : 1111,
            db: params.db,
        }) as ExtendedRedisClient;
        client.on("error", (error, msg) => {
            if (msg) {
                log(msg);
                fancyLog(msg);
            }
            if (error) {
                log(error);
                fancyLog(JSON.stringify(error));
            }
        });

        return new Redis(params, client);
    }
    static newSub(paramsOrHost: RedisParamsValueType | string) {
        const params = this.computeParams(paramsOrHost);
        const redis = this.newRedis(params);
        SUB_CONNECTIONS.push(redis.client);

        return redis;
    }
    static async quit() {
        const connections = Object.values(STATIC_CONNECTIONS).concat(Object.values(SUB_CONNECTIONS));
        const promises = new PromisePool(100);
        for (const connection of connections)
            if (connection) await promises.registerFn((res: () => void) => connection.quit(res));
        await promises.flush();
    }
}
