import { DBObject } from "types/DBObject";
import { HTTPHeaderName } from "types/objects/HTTPHeaderName";
import { HTTPHeaderValue } from "types/objects/HTTPHeaderValue";

export class HTTPHeader extends DBObject<HTTPHeader> {
    readonly name: HTTPHeaderName;
    readonly value: HTTPHeaderValue;

    constructor(name?: string, value?: string) {
        if (!name || !value) super();
        else super({
            name: new HTTPHeaderName({ value: name }),
            value: new HTTPHeaderValue({ value: value }),
        });
    }

    insertCols(): string[] {
        return ["id", "name", "value"];
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
