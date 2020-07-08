import { DBObject } from "types/DBObject";

export class HTTPHeaderValue extends DBObject<HTTPHeaderValue> {
    readonly value: string;

    hashPrefix(): string {
        return "http-header-value";
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
        return "HTTPHeaderValue";
    }
}
