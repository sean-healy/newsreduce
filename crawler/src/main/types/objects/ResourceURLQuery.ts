import { DBObject } from "../../types/DBObject";

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

    insertCols(): string[] {
        return ["id", "value"];
    }
    getInsertParams(): any[] {
        const params = [this.getID(), this.value];

        return params;
    }
    table(): string {
        return "ResourceURLQuery";
    }
    hashPrefix(): string {
        return "resource-url-query";
    }
    hashSuffix(): string {
        return this.value;
    }
}
