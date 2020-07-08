import { defaultHash } from "common/hashing";
import { bytesToBigInt, STR_ONE } from "common/util";
import { db, renewRedis, newRedis } from "common/connections";
import { log } from "common/logging";

const lock = new Set<bigint>();
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
        const suffix = this.hashSuffix();
        const prefix = this.hashPrefix();
        let idBytes: Buffer;
        if (!prefix || !suffix) idBytes = null;
        else idBytes = defaultHash(this.hashPrefix(), this.hashSuffix());

        return idBytes;
    }
    getID() {
        return bytesToBigInt(this.getIDBytes());
    }
    getInsertStatement(): string {
        const cols = this.insertCols().map(col => "`" + col + "`").join(", ");
        return `insert ignore into ${this.table()}(${cols}) values ?`
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
    insertSingular(options = {
        recursive: false,
    }) {
        const promises: Promise<any>[] = [];
        // No circular dependencies allowed.
        if (options.recursive) {
            for (const promise of this.getDeps().map(dep => dep.insertSingular(options)))
                promises.push(promise);
        }
        promises.push(new Promise<void>(async (res, rej) => {
            const query = this.getInsertStatement();
            const params = this.getSingularInsertParams();
            const filledQuery = (await db()).query(query, params, err => {
                if (err) {
                    log(err);
                    rej(err);
                } else res();
            });
            log(filledQuery.sql);
        }));

        return Promise.all(promises);
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
    enqueueInsert(options = {
        recursive: false,
    }) {
        // No circular dependencies allowed.
        if (options.recursive) {
            this.getDeps().forEach(dep => dep.enqueueInsert(options));
        }
        const insertParams = this.getInsertParams();
        DBObject.stringifyBigIntsInPlace(insertParams);
        const payload = JSON.stringify({
            table: this.table(),
            params: insertParams,
        });
        const id = this.getID();
        if (id)
            renewRedis("inserts").hset(this.table(), this.getID().toString(), payload);
        else
            renewRedis("inserts").sadd(this.table(), payload);
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
    hashPrefix(): string {
        return null;
    }
    hashSuffix(): string {
        return null;
    }
    unlock() {
        const id = this.getID();
        lock.delete(id);
        renewRedis("fileLock").del(id.toString(), STR_ONE, err => {
            if (!err)
                renewRedis("fileLock").publish(id.toString(), STR_ONE);
        });
    }
    checkout() {
        return new Promise<boolean>((res, rej) => {
            const id = this.getID();
            if (lock.has(id)) {
                res(false);
            } else {
                lock.add(id);
                renewRedis("fileLock").get(id.toString(), (err, response) => {
                    if (err) rej(err);
                    else if (response === STR_ONE) {
                        res(false);
                    } else {
                        renewRedis("fileLock").set(id.toString(), STR_ONE);
                        res(true);
                    }
                });
            }
        });
    }
    whenUnlocked() {
        const id = this.getID().toString();
        const client = newRedis("fileLock");
        client.subscribe(id);
        return new Promise<void>(res => {
            client.on("message", (_, msg) => {
                if (msg === STR_ONE) res();
                client.quit();
            });
        });
    }
}
