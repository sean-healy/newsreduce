import { DBObject } from "types/DBObject";

export class HTTPHeaderName extends DBObject<HTTPHeaderName> {
    readonly value: string;

    hashPrefix(): string {
        return "http-header-name";
    }
    hashSuffix(): string {
        return this.value;
    }
    insertCols(): string[] {
        return ["id", "value"];
    }
    getInsertParams(): any[] {
        return [this.getID(), this.value];
    }
    table(): string {
        return "HTTPHeaderName";
    }
}
