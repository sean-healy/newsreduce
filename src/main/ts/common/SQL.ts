import { DNS } from "common/DNS";
import { createConnection, Connection } from "mysql";
import { log } from "common/logging";
import { fancyLog } from "./util";
import { GlobalConfig } from "./GlobalConfig";

export let DB_CLIENT: Connection = null;
export class SQL {
    static async db() {
        if (DB_CLIENT === null) {
            let ip = await DNS.lookup(GlobalConfig.softFetch().database.host);
            const myIP = await DNS.whoami();
            if (ip === myIP) ip = DNS.LOCALHOST;
            const sqlParams = {
                ...GlobalConfig.hardFetch().database,
                supportBigNumbers: true,
            }
            let newClient = createConnection(sqlParams);
            newClient.on("error", async error => {
                const oldDB = DB_CLIENT;
                DB_CLIENT = null;
                oldDB.destroy();
                await SQL.db();
                if (error) {
                    log(`${error.errno}`);
                    log(error.code);
                    log(error.message);
                    log(error.name);
                    log(error.sqlMessage);
                    fancyLog(JSON.stringify(error));
                }
            });
            // Be careful for concurrency bugs creating multiple connections.
            if (DB_CLIENT === null) DB_CLIENT = newClient;
            else newClient.destroy();
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
                fancyLog("error on attempt " + attempt.toString());
                fancyLog(JSON.stringify(err));
                const oldClient = DB_CLIENT;
                DB_CLIENT = null;
                oldClient.destroy();
                await SQL.db();
            }
        }

        return [] as any as T;
    }
    static async query<T>(template: string, params: any[] = []) {
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
    static csvField(param: any) {
        //fancyLog("csvField " + `${param}`);
        let stringified: string;
        if (param === null || param === undefined) stringified = "NULL";
        else if (typeof param === "boolean") {
            const paramAsTinyint = param ? 1 : 0;
            stringified = `"${paramAsTinyint}"`;
        } else {
            const paramAsString = param.toString();
            const escapedParam = paramAsString.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            stringified = `"${escapedParam}"`
        }

        return stringified;
    }
    static csvRow(params: any[]) {
        return params.map(SQL.csvField).join(",");
    }
}
