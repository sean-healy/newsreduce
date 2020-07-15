import { createConnection, Connection } from "mysql";
import redis, { RedisClient } from "redis";
import fetch from "node-fetch";
import { log } from "./logging";
import { ENV } from "./config";

const MAIN_HOST = "newsreduce.org";
const LOCALHOST = "127.0.0.1";

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
        params = await fetch(new ResourceURL(NET_AGENT_ENDPOINT).toURL())
            .then(res => res.json());
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
    zpopmax(args: [string, number], cb: (err: any, response: string[]) => void):
        any;
}
