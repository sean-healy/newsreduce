import { defaultHash } from "common/hashing";
import { bytesToBigInt } from "common/util";
import { log } from "common/logging";
import { INSERT_CACHE } from "common/events";
import { Redis, REDIS_PARAMS } from "common/Redis";
import { SQL } from "common/SQL";

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
        if (options.recursive)
            for (const promise of this.getDeps().map(dep => dep.singularInsert(options)))
                promises.push(promise);
        const query = this.getInsertStatement();
        const params = this.getSingularInsertParams();
        promises.push(SQL.query(query, params).then(() => {
            const id = this.getID();
            if (id) Redis.renewRedis(REDIS_PARAMS.general).sadd(INSERT_CACHE, id.toString());
        }));

        await Promise.all(promises);
    }
    async bulkInsert(params: any[][]) {
        if (!params) return;
        const insertCols = this.insertCols().length;
        params = params.filter(paramRow => paramRow.length === insertCols);
        if (params.length === 0) return;
        const query = this.getInsertStatement();
        log(query);
        log(JSON.stringify(params));
        await SQL.query(query, [params]);
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
    async singularSelect(columns?: (keyof T | "*")[]) {
        let cols: string;
        if (columns) cols = columns.map(column => "`" + column + "`").join(", ");
        else cols = "*";
        const query = `select ${cols} from ${this.table()} where ${this.idCol()} = ?`;
        return await SQL.query(query, [this.getID()])[0];
    }
    async bulkSelect(ids: bigint[], columns: (keyof T)[]): Promise<{ [key: string]: string }[]> {
        if (!ids || ids.length === 0) return [];
        const idCol = this.idCol();
        const query = `select ${idCol}, ${columns.join(", ")} from ${this.table()} where ${idCol} in ?`;
        const response = await SQL.query<{ [key: string]: string }[]>(query, [[ids]]);

        return response;
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
