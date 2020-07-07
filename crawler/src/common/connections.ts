import { createConnection, Connection } from "mysql";
import redis, { RedisClient } from "redis";
import fetch from "node-fetch";
import { ResourceURL } from "../types/Resource";
import { generateURL } from "./url";

const MAIN_HOST = "newsreduce.org";
const DEFAULT_REDIS_PORT = 6379;
const DEFAULT_REDIS_DB = 0;

export const REDIS_PARAMS = {
    local: {
        host: "127.0.0.1",
        port: DEFAULT_REDIS_PORT,
        db: DEFAULT_REDIS_DB,
    },
    events: {
        host: MAIN_HOST,
        port: DEFAULT_REDIS_PORT,
        db: DEFAULT_REDIS_DB,
    },
    fetchSchedule: {
        host: MAIN_HOST,
        port: DEFAULT_REDIS_PORT,
        db: 1,
    },
    htmlProcessor: {
        host: MAIN_HOST,
        port: DEFAULT_REDIS_PORT,
        db: 2,
    },
    hitProcessor: {
        host: MAIN_HOST,
        port: DEFAULT_REDIS_PORT,
        db: 3,
    },
    throttle: {
        host: MAIN_HOST,
        port: DEFAULT_REDIS_PORT,
        db: 4,
    },
    inserts: {
        host: MAIN_HOST,
        port: DEFAULT_REDIS_PORT,
        db: 5,
    },
    legacyRetains: {
        host: MAIN_HOST,
        port: DEFAULT_REDIS_PORT,
        db: 6,
    },
};

const NET_AGENT_PARAMS: ResourceURL = {
    host: MAIN_HOST,
    port: 9999,
    ssl: false,
    path: "",
    query: "",
};

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
    if (!params)
        params = await fetch(generateURL(NET_AGENT_PARAMS)).then(res => res.json());

    return params;
}

let dbClient: Connection = null;
export async function db() {
    if (dbClient === null) {
        console.log("Fetching SQL config.");
        const password = (await getParams()).sql
        console.log("Fetched SQL config.");
        dbClient = createConnection({ ...SQL_PARAMS, password });
    }

    return dbClient;
}

export interface NewRedisTypes {
    zpopmax(args: [string, number], cb: (err: any, response: string[]) => void): any;
}

const staticConnections: { [nameOrHost: string]: RedisClient & NewRedisTypes } = {};
export function renewRedis(nameOrHost: string) {
    let client: RedisClient & NewRedisTypes;
    if (nameOrHost in staticConnections) client = staticConnections[nameOrHost];
    else {
        client = newRedis(nameOrHost);
        staticConnections[nameOrHost] = client;
    }

    return client;
}

export function newRedis(nameOrHost: string) {
    let params = REDIS_PARAMS[nameOrHost];
    if (!params) {
        params = {
            host: nameOrHost,
            port: DEFAULT_REDIS_PORT,
            db: DEFAULT_REDIS_DB,
        };
        REDIS_PARAMS[nameOrHost] = params;
    }
    return redis.createClient({
        host: params.host,
        port: params.port,
        db: params.db,
    }) as RedisClient & NewRedisTypes;
}
