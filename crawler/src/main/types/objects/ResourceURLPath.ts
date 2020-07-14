import { DBObject } from "types/DBObject";

export class ResourceURLPath extends DBObject<ResourceURLPath> {
    readonly value: string;

    hashPrefix(): string {
        return "resource-url-path";
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
        return "ResourceURLPath";
    }
}
