import { createConnection, Connection } from "mysql";
import redis, { RedisClient } from "redis";
import fetch from "node-fetch";
import { Resource } from "../types/Resource";
import { generateURL } from "./url";

const MAIN_HOST = "newsreduce.org";
const REDIS_PORT = 6379;

export const REDIS_PARAMS = {
    local: {
        host: "127.0.0.1",
        port: REDIS_PORT,
        db: 0,
    },
    events: {
        host: MAIN_HOST,
        port: REDIS_PORT,
        db: 1,
    },
    fetchSchedule: {
        host: MAIN_HOST,
        port: REDIS_PORT,
        db: 2,
    },
    htmlProcessor: {
        host: MAIN_HOST,
        port: REDIS_PORT,
        db: 3,
    },
    hitProcessor: {
        host: MAIN_HOST,
        port: REDIS_PORT,
        db: 4,
    },
    throttle: {
        host: MAIN_HOST,
        port: REDIS_PORT,
        db: 5,
    },
};

const NET_AGENT_PARAMS: Resource = {
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

const staticConnections: { [name: string]: RedisClient & NewRedisTypes } = {};
export function renewRedis(name: keyof typeof REDIS_PARAMS) {
    let client: RedisClient & NewRedisTypes;
    if (name in staticConnections) client = staticConnections[name];
    else {
        client = newRedis(name);
        staticConnections[name] = client;
    }

    return client;
}

export function newRedis(name: keyof typeof REDIS_PARAMS) {
    const params = REDIS_PARAMS[name];
    if (!params) return null;
    return redis.createClient({
        host: params.host,
        port: params.port,
        db: params.db,
    }) as RedisClient & NewRedisTypes;
}
