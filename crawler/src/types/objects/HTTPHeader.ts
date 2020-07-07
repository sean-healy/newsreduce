import { DBObject } from "../DBObject";
import { HTTPHeaderName } from "./HTTPHeaderName";
import { HTTPHeaderValue } from "./HTTPHeaderValue";

export class HTTPHeader extends DBObject<HTTPHeader> {
    name: HTTPHeaderName;
    value: HTTPHeaderValue;

    constructor(name?: string, value?: string) {
        if (!name || !value) super();
        else super({
            name: new HTTPHeaderName({ value: name }),
            value: new HTTPHeaderValue({ value: value }),
        });
    }

    getInsertStatement(): string {
        return `insert ignore into HTTPHeader(id, name, value) values ? `
    }
    getInsertParams(): any[] {
        return [this.getID(), this.name.getID(), this.value.getID()];
    }
    hashPrefix(): string {
        return "http-header";
    }
    hashSuffix(): string {
        return `${this.name.value}\0${this.value.value}`;
    }
    table(): string {
        return "HTTPHeader";
    }
}
