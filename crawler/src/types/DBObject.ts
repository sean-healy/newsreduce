import { defaultHash } from "../common/hashing";
import { bytesToBigInt } from "../common/util";
import { db, renewRedis } from "../common/connections";
import { log } from "../common/logging";

export abstract class DBObject<T extends DBObject<T>> {
    abstract hashPrefix(): string;
    abstract hashSuffix(): string;
    abstract getInsertStatement(): string;
    abstract getInsertParams(): any[];
    abstract table(): string;
    constructor(src?: { [key in keyof T]?: T[key] }) {
        if (src) {
            const dst = this as DBObject<T> as T;
            for (const property in src)
                dst[property] = src["property"];
        }
    }
    getIDBytes() {
        return defaultHash(this.hashPrefix(), this.hashSuffix());
    }
    getID() {
        return bytesToBigInt(this.getIDBytes());
    }
    getBulkInsertParams(items: T[]): any[] {
        return [items.map(item => item.getInsertParams())];
    }
    getSingularInsertParams(): any[] {
        return [[this.getInsertParams()]]
    }
    getDeps(): DBObject<any>[] {
        return [];
    }
    insert() {
        return new Promise(async (res, rej) => {
            const query = this.getInsertStatement();
            const params = this.getSingularInsertParams();
            const filledQuery = (await db()).query(query, params, err => {
                if (err) {
                    log(err);
                    rej(err);
                } else res();
            });
            log(filledQuery.sql);
        });
    }
    deepInsert() {
        // No circular dependencies allowed.
        this.getDeps().forEach(dep => dep.deepInsert());
        this.insert();
    }
    enqueueInsert() {
        const payload = JSON.stringify({
            table: this.table(),
            params: this.getInsertParams(),
        });
        renewRedis("inserts").hset(this.table(), this.getID().toString(), payload);
    }
    enqueueDeepInsert() {
        // No circular dependencies allowed.
        this.getDeps().forEach(dep => dep.enqueueDeepInsert());
        this.enqueueInsert();
    }
    singularSelect(id: bigint, columns: (keyof T)[]) {
        return new Promise(async (res, rej) => {
            const query = `select ${columns.join(", ")} from ${this.table()} where ${this.idCol()} = ?`;
            const filledQuery = (await db()).query(query, [id], (err, response) => {
                if (err) {
                    log(err);
                    rej(err);
                } else res(response);
            });
            log(filledQuery.sql);
        });
    }
    bulkSelect(ids: bigint[], columns: (keyof T)[]): Promise<{ [key: string]: string }[]> {
        return new Promise(async (res, rej) => {
            const idCol = this.idCol();
            const query = `select ${idCol}, ${columns.join(", ")} from ${this.table()} where ${idCol} in ?`;
            const filledQuery = (await db()).query(query, [[ids]], (err, response) => {
                if (err) {
                    log(err);
                    rej(err);
                } else res(response);
            });
            log(filledQuery.sql);
        });
    }
    idCol(): string {
        return "id";
    }
}
