import { DBObject } from "../DBObject";

export class HTTPHeaderValue extends DBObject<HTTPHeaderValue> {
    value: string;

    hashPrefix(): string {
        return "http-header-value";
    }
    hashSuffix(): string {
        return this.value;
    }
    getInsertStatement(): string {
        return `insert ignore into HTTPHeaderValue(id, value) values ?`
    }
    getInsertParams(): any[] {
        return [this.getID(), this.value];
    }
    table(): string {
        return "HTTPHeaderValue";
    }
}
