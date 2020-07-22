import { DBObject } from "types/DBObject";

export class ResourceVersionType extends DBObject<ResourceVersionType> {
    readonly filename: string;

    insertCols(): string[] {
        return ["id", "filename"];
    }
    getInsertParams(): any[] {
        const params = [this.getID(), this.filename];

        return params;
    }
    table(): string {
        return "ResourceVersionType";
    }
    hashSuffix(): string {
        return this.filename;
    }

    static RAW_HTML = new ResourceVersionType({
        filename: "raw.html",
    });
    static RAW_TXT = new ResourceVersionType({
        filename: "raw.txt",
    });
    static HITS = new ResourceVersionType({
        filename: "hits.bin",
    });
    static HEADERS = new ResourceVersionType({
        filename: "headers.txt",
    });
}
