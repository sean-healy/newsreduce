import { defaultHash } from "common/hashing";
import { bytesToBigInt } from "common/util";
import { db } from "common/connections";
import { log } from "common/logging";
import { Query } from "mysql";
import { INSERT_CACHE } from "common/events";
import { Redis, REDIS_PARAMS } from "common/Redis";

export abstract class DBObject<T extends DBObject<T>> {
    abstract getInsertParams(): any[];
    abstract table(): string;
    abstract insertCols(): string[];
    constructor(src?: { [key in keyof T]?: T[key] }) {
        if (src) {
            const dst = this as DBObject<T> as T;
            for (const property in src) {
                dst[property] = src[property];
            }
        }
    }
    getIDBytes() {
        const prefix = this.hashPrefix();
        return prefix ? defaultHash(prefix, this.hashSuffix()) : null;
    }
    getID() {
        const idBytes = this.getIDBytes();

        return idBytes ? bytesToBigInt(idBytes) : null;
    }
    getInsertStatement(): string {
        const cols = this.insertCols().map(col => "`" + col + "`").join(", ");
        return `insert ignore into ${this.table()}(${cols}) values ?`
    }
    getSingularInsertParams(): any[] {
        return [[this.getInsertParams()]]
    }
    getDeps(): DBObject<any>[] {
        return [];
    }
    async singularInsert(options = { recursive: false }) {
        const promises: Promise<any>[] = [];
        // No circular dependencies allowed.
        if (options.recursive) {
            for (const promise of this.getDeps().map(dep => dep.singularInsert(options)))
                promises.push(promise);
        }
        promises.push(new Promise<void>(async (res, rej) => {
            const query = this.getInsertStatement();
            const params = this.getSingularInsertParams();
            const filledQuery = (await db()).query(query, params, err => {
                if (err) {
                    log(err);
                    rej(err);
                } else {
                    res();
                    const id = this.getID();
                    if (id)
                        Redis.renewRedis(REDIS_PARAMS.general).sadd(INSERT_CACHE, id.toString());
                }
            });
            log(filledQuery.sql);
        }));

        await Promise.all(promises);
    }
    async bulkInsert(params: any[][]) {
        if (!params) return;
        const insertCols = this.insertCols().length;
        params = params.filter(paramRow => paramRow.length === insertCols);
        if (params.length === 0) return;
        const query = this.getInsertStatement();
        const client = await db();
        log(query);
        log(JSON.stringify(params));
        await new Promise<Query>(async (res, rej) =>
            log(client.query(query, [params], err => err ? rej(err) : res()).sql));
    }
    static stringifyBigIntsInPlace(obj: object) {
        if (typeof obj === "object") {
            for (const key in obj) {
                const value = obj[key];
                if (typeof value === "bigint")
                    obj[key] = value.toString();
                else DBObject.stringifyBigIntsInPlace(value);
            }
        }
    }
    async enqueueInsert(options = {
        recursive: false,
    }) {
        const promises = [];
        // No circular dependencies allowed.
        if (options.recursive)
            for (const dep of this.getDeps())
                promises.push(dep.enqueueInsert(options));
        const insertParams = this.getInsertParams();
        DBObject.stringifyBigIntsInPlace(insertParams);
        const payload = JSON.stringify(insertParams);
        const id = this.getID();
        promises.push(new Promise<void>(async res => {
            if (id) {
                const idStr = id.toString();
                const isMember = await Redis.renewRedis(REDIS_PARAMS.general).sismember(INSERT_CACHE, idStr);
                if (!isMember) await Redis.renewRedis(REDIS_PARAMS.inserts).hset(this.table(), idStr, payload);
            } else await Redis.renewRedis(REDIS_PARAMS.inserts).sadd(this.table(), payload);
            res();
        }));

        await Promise.all(promises);
    }
    singularSelect(columns?: (keyof T | "*")[]) {
        return new Promise(async (res, rej) => {
            let cols: string;
            if (columns) cols = columns.map(column => "`" + column + "`").join(", ");
            else cols = "*";
            const query = `select ${cols} from ${this.table()} where ${this.idCol()} = ?`;
            const filledQuery = (await db()).query(query, [this.getID()], (err, response) => {
                if (err) {
                    log(err);
                    rej(err);
                } else res(response[0]);
            });
            log(filledQuery.sql);
        });
    }
    async bulkSelect(ids: bigint[], columns: (keyof T)[]): Promise<{ [key: string]: string }[]> {
        if (!ids || ids.length === 0) return [];
        return await new Promise(async (res, rej) => {
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
    hashPrefix(): string {
        return null;
    }
    hashSuffix(): string {
        return null;
    }
    static forTable(table: string): DBObject<any> {
        const DBObjectT = require(`types/objects/${table}`)[table];

        return new DBObjectT()
    }
}
