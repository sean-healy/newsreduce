import { DBObject } from "../DBObject";

export class HTTPHeaderName extends DBObject<HTTPHeaderName> {
    value: string;

    hashPrefix(): string {
        return "http-header-name";
    }
    hashSuffix(): string {
        return this.value;
    }
    getInsertStatement(): string {
        return `insert ignore into HTTPHeaderName(id, value) values ?`
    }
    getInsertParams(): any[] {
        return [this.getID(), this.value];
    }
    table(): string {
        return "HTTPHeaderName";
    }
}
