import { createConnection, Connection } from "mysql";
import redis, { RedisClient } from "redis";
import fetch from "node-fetch";
import { log } from "./logging";
import { ENV } from "./config";

const MAIN_HOST = "newsreduce.org";
const LOCALHOST = "127.0.0.1";
const DEFAULT_REDIS_PORT = 6379;
const DEFAULT_REDIS_DB = 0;

export interface RedisParamsValueType {
    host: string;
    port: number;
    db: number;
    name: string;
}
export const REDIS_PARAMS = {
    local: {
        host: LOCALHOST,
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
    fileLock: {
        host: LOCALHOST,
        port: DEFAULT_REDIS_PORT,
        db: 5,
    } as RedisParamsValueType,
    fetchLock: {
        host: MAIN_HOST,
        port: DEFAULT_REDIS_PORT,
        db: 6,
    } as RedisParamsValueType,
};
for (const key in REDIS_PARAMS) REDIS_PARAMS[key].name = key;

export const ENTITIES_TO_COMPRESS = "entities-to-compress";

const NET_AGENT_ENDPOINT = `http://${MAIN_HOST}:9999`;

const SQL_PARAMS = {
    host: MAIN_HOST,
    user: "newsreduce",
    database: "newsreduce",
    supportBigNumbers: true,
};

interface Params {
    sql: string;
}
let params: Params = null;
export async function getParams() {
    if (!params) {
        const { ResourceURL } = require("types/objects/ResourceURL");
        params = await fetch(new ResourceURL(NET_AGENT_ENDPOINT).toURL()).then(res => res.json());
    }

    return params;
}

let dbClient: Connection = null;
export async function db() {
    if (dbClient === null) {
        log("Fetching SQL config.");
        const password = (await getParams()).sql
        log("Fetched SQL config.");
        dbClient = createConnection({ ...SQL_PARAMS, password });
    }

    return dbClient;
}

export interface ExtendedRedisClient extends RedisClient {
    zpopmax(args: [string, number], cb: (err: any, response: string[]) => void): any;
}

export const STATIC_CONNECTIONS: { [nameOrHost: string]: ExtendedRedisClient } = {};
export function renewRedis(paramsOrHost: RedisParamsValueType | string) {
    const name: string = (typeof paramsOrHost === "string") ? paramsOrHost : paramsOrHost.name;
    let connection = STATIC_CONNECTIONS[name];
    if (!connection) {
        connection = newRedis(paramsOrHost);
        STATIC_CONNECTIONS[name] = connection;
    }

    return connection;
}

export const defaultHostParams = (host: string) => ({
    host,
    name: host,
    port: DEFAULT_REDIS_PORT,
    db: DEFAULT_REDIS_DB,
});
export function newRedis(paramsOrHost: RedisParamsValueType | string) {
    const name: string = (typeof paramsOrHost === "string") ? paramsOrHost : paramsOrHost.name;
    if (!(name in REDIS_PARAMS))
        REDIS_PARAMS[name] = defaultHostParams(paramsOrHost as string);
    const params = REDIS_PARAMS[name];

    return redis.createClient({
        host: ENV[0] === "prod" ? params.host : LOCALHOST,
        port: ENV[0] === "prod" ? params.port : 1111,
        db: params.db,
    }) as RedisClient & ExtendedRedisClient;
}
