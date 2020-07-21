import { DBObject } from "types/DBObject";

export class ResourceHash extends DBObject<ResourceHash> {
    readonly value: string;

    constructor(value?: string) {
        if (value) super({ value });
        else super();
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
        return "ResourceHash";
    }
}
