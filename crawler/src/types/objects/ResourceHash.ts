import { DBObject } from "../DBObject";

export class ResourceHash extends DBObject<ResourceHash> {
    value: string;

    hashPrefix(): string {
        return "resource-hash";
    }
    hashSuffix(): string {
        return this.value;
    }
    getInsertStatement(): string {
        return `insert ignore into ResourceHash(id, value) values ?`
    }
    getInsertParams(): any[] {
        return [this.getID(), this.value];
    }
    table(): string {
        return "ResourceHash";
    }
}
