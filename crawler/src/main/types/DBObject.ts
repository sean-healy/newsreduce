import { defaultHash } from "common/hashing";
import { bytesToBigInt } from "common/util";
import { INSERT_CACHE } from "common/events";
import { Redis, REDIS_PARAMS } from "common/Redis";
import { SQL } from "common/SQL";

const ESCAPE = "ESCAPED BY '\\'";
const ENCLOSE = `ENCLOSED BY '"'`;
const FIELD_TERM = "FIELDS TERMINATED BY ','";
const LINE_TERM = "LINES TERMINATED BY '\n'";

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
            const deps = this.getDeps();
            for (const insert of deps.map(dep => dep.singularInsert(options)))
                promises.push(insert);
        }
        const query = this.getInsertStatement();
        const params = this.getSingularInsertParams();
        promises.push(SQL.query(query, params).then(() => {
            const id = this.getID();
            if (id) Redis
                .renewRedis(REDIS_PARAMS.general)
                .sadd(INSERT_CACHE, id.toString());
        }));

        await Promise.all(promises);
    }
    async bulkInsert(csvFile: string) {
        if (!csvFile) return;
        const cols = this.insertCols().map(col => `\`${col}\``).join(",");
        const table = this.table();
        const query = `LOAD DATA INFILE ? IGNORE INTO TABLE \`${table}\` ${FIELD_TERM} ${ENCLOSE} ${ESCAPE} ${LINE_TERM} (${cols})`;
        await SQL.query(query, [csvFile])
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
    asCSVRow() {
        return SQL.csvRow(this.getInsertParams());
    }
    async enqueueInsert(options = { recursive: false }) {
        const promises = [];
        // No circular dependencies allowed.
        if (options.recursive)
            for (const dep of this.getDeps())
                promises.push(dep.enqueueInsert(options));
        const payload = this.asCSVRow();
        const id = this.getID();
        promises.push(new Promise<void>(async res => {
            let key: string;
            if (id) key = id.toString();
            else key = `${this.table()}:${payload}`;
            const isMember = await Redis.renewRedis(REDIS_PARAMS.general).sismember(INSERT_CACHE, key);
            if (!isMember) await Redis.renewRedis(REDIS_PARAMS.inserts).sadd(this.table(), payload);
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
