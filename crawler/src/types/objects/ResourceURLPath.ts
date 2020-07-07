import { DBObject } from "../DBObject";

export class ResourceURLPath extends DBObject<ResourceURLPath> {
    value: string;

    hashPrefix(): string {
        return "resource-url-path";
    }
    hashSuffix(): string {
        return this.value;
    }
    getInsertStatement(): string {
        return `insert ignore into ResourceURLPath(id, value) values ?`
    }
    getInsertParams(): any[] {
        return [this.getID(), this.value];
    }
    table(): string {
        return "ResourceURLPath";
    }
}
