import { DNS } from "common/DNS";
import { createConnection, Connection } from "mysql";
import { NET_AGENT_ENDPOINT } from "common/config";
import { log } from "common/logging";
import { MAIN_HOSTNAME, LOCALHOST } from "common/config";
import fetch from "node-fetch";

export const SQL_PARAMS = {
    user: "newsreduce",
    database: "newsreduce",
    supportBigNumbers: true,
};

let DB_CLIENT: Connection = null;
export class SQL {
    static async db() {
        if (DB_CLIENT === null) {
            let ip = await DNS.lookup(MAIN_HOSTNAME);
            const myIP = await DNS.whoami();
            if (ip === myIP) ip = LOCALHOST;
            log("Fetching SQL config.");
            const params = await fetch(NET_AGENT_ENDPOINT).then(res => res.json());
            const password = params.sql
            log("Fetched SQL config.");
            DB_CLIENT = createConnection({ ...SQL_PARAMS, password, host: ip });
        }

        return DB_CLIENT;
    }
    static async tryLoop<T>(
        cb: (res: (response?: T) => void, rej: (reason?: any) => void) => void
    ) {
        for (let attempt = 0; attempt < 10; ++attempt) {
            try {
                const response = await new Promise<T>(cb);

                return response;
            } catch (err) {
                log("error on attempt", attempt.toString());
                log(err);
                console.debug(err);
                const oldClient = DB_CLIENT;
                DB_CLIENT = null;
                oldClient.destroy();
            }
        }

        return null;
    }
    static async query<T>(template: string, params: any[]) {
        return this.tryLoop<T>((res, rej) => {
            SQL.db().then(db => {
                db.query(template, params, (err, results: T) => {
                    if (err) rej(err);
                    else res(results);
                });
            });
        });
    }
    static async destroy() {
        (await SQL.db()).destroy();
    }
}
