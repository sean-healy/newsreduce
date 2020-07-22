import { DBObject } from "types/DBObject";

export class ResourceURLQuery extends DBObject<ResourceURLQuery> {
    readonly value: string;

    constructor(arg?: string | { [key in keyof ResourceURLQuery]?: ResourceURLQuery[key] }) {
        if (typeof arg === "string") {
            super({
                value: arg,
            });
        } else {
            super(arg);
        }
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
        return "ResourceURLQuery";
    }
}
