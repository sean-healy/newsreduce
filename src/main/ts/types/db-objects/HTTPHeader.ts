import { DBObject } from "types/DBObject";
import { HTTPHeaderName } from "types/db-objects/HTTPHeaderName";
import { HTTPHeaderValue } from "types/db-objects/HTTPHeaderValue";

export class HTTPHeader extends DBObject<HTTPHeader> {
    readonly name: HTTPHeaderName;
    readonly value: HTTPHeaderValue;

    constructor(name?: string, value?: string) {
        if (name && value)
            super({
                name: new HTTPHeaderName({ value: name }),
                value: new HTTPHeaderValue({ value: value }),
            });
        else super();
    }

    insertCols(): string[] {
        return ["id", "name", "value"];
    }
    getInsertParams(): any[] {
        return [this.getID(), this.name.getID(), this.value.getID()];
    }
    hashSuffix(): string {
        return `${this.name.value}\0${this.value.value}`;
    }
    table(): string {
        return "HTTPHeader";
    }
    getDeps() {
        return [this.name, this.value];
    }
}
