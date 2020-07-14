import { DBObject } from "types/DBObject";

export class HTTPHeaderValue extends DBObject<HTTPHeaderValue> {
    readonly value: string;

    constructor(arg: string | { [key in keyof HTTPHeaderValue]?: HTTPHeaderValue[key] }) {
        if (!arg) super();
        else if (typeof arg === "string")
            super({ value: arg });
        else {
            const { value } = arg;
            if (value) super({ value });
            else throw new Error("value can't be falsey");
        }
    }

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
