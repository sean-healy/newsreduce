import { defaultHash } from "common/hashing";
import { bytesToBigInt, Dictionary } from "utils/alpha";
import { Redis, REDIS_PARAMS } from "common/Redis";
import { SQL } from "common/SQL";
import { GenericConstructor } from "./GenericConstructor";

const ESCAPE = "ESCAPED BY '\\\\'";
const ENCLOSE = `ENCLOSED BY '"'`;
const FIELD_TERM = "FIELDS TERMINATED BY ','";
const LINE_TERM = "LINES TERMINATED BY '\\n'";

export abstract class DBObject<T extends DBObject<T> = any> extends GenericConstructor<T> {
    abstract getInsertParams(): any[];
    abstract table(): string;
    abstract insertCols(): string[];
    getIDBytes() {
        const suffix = this.hashSuffix();
        return suffix === null ? null : defaultHash(this.table(), suffix);
    }
    getID() {
        const idBytes = this.getIDBytes();

        return idBytes ? bytesToBigInt(idBytes) : null;
    }
    getInsertStatement(): string {
        const cols = this.insertCols().map(col => "`" + col + "`").join(", ");
        return `insert ignore into \`${this.table()}\`(${cols}) values ?`
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
        promises.push(SQL.query(query, params));

        await Promise.all(promises);
    }
    noReplace(): boolean {
        return false;
    }
    async bulkInsert(csvFile: string) {
        if (!csvFile) return;
        const cols = this.insertCols().map(col => `\`${col}\``).join(",");
        const table = `\`${this.table()}\``;
        const query =
            `LOAD DATA LOCAL INFILE ? ` +
            `${this.noReplace() ? "IGNORE" : "REPLACE"} INTO TABLE ${table} ` +
            `${FIELD_TERM} ${ENCLOSE} ${ESCAPE} ${LINE_TERM} (${cols})`;
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
        promises.push(Redis.renewRedis(REDIS_PARAMS.inserts).sadd(this.table(), payload));

        await Promise.all(promises);
    }
    singularSelect(columns?: (keyof T | "*")[]) {
        return this.singularSelectByID(this.getID(), columns);
    }
    async singularSelectByID(id: bigint, columns?: (keyof T | "*")[]) {
        let cols: string;
        if (columns) cols = columns.map(column => `\`${column}\``).join(",");
        else cols = "*";
        const idCol = `\`${this.idCol()}\``;
        const query = `select ${cols} from \`${this.table()}\` where ${idCol} = ?`;
        return (await SQL.query(query, [id]))[0];
    }
    async bulkSelect(ids: bigint[], columns: (keyof T | "id")[]): Promise<{ [key: string]: string }[]> {
        if (!ids || ids.length === 0) return [];
        const idCol = `\`${this.idCol()}\``;
        const otherCols = columns.map(col => `\`${col}\``).join(",");
        const query = `select ${idCol},${otherCols} from \`${this.table()}\` where ${idCol} in ?`;
        const response = await SQL.query<{ [key: string]: string }[]>(query, [[ids]]);

        return response;
    }
    async selectAll(): Promise<Dictionary<any>[]> {
        const query = `select * from \`${this.table()}\``;
        const response = await SQL.query<Dictionary<string>[]>(query);

        return response;
    }
    idCol(): string {
        return "id";
    }
    hashSuffix(): string {
        return null;
    }
    static forTable(table: string): DBObject<any> {
        const DBObjectT = require(`types/db-objects/${table}`)[table];

        return new DBObjectT()
    }
}
