import { DNS } from "common/DNS";
import { createConnection, Connection } from "mysql";
import { getParams } from "common/config";
import { log } from "common/logging";
import { MAIN_HOSTNAME, LOCALHOST } from "common/config";

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
            const password = (await getParams()).sql
            log("Fetched SQL config.");
            DB_CLIENT = createConnection({ ...SQL_PARAMS, password, host: ip });
        }

        return DB_CLIENT;
    }
    static async query<T>(template: string, params: any[]) {
        return new Promise<T>((res, rej) => {
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
