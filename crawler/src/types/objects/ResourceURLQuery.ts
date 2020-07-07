import { DBObject } from "../DBObject";

export class ResourceURLQuery extends DBObject<ResourceURLQuery> {
    value: string;

    hashPrefix(): string {
        return "resource-url-query";
    }
    hashSuffix(): string {
        return this.value;
    }
    getInsertStatement(): string {
        return `insert ignore into ResourceURLQuery(id, value) values ?`
    }
    getInsertParams(): any[] {
        return [this.getID(), this.value];
    }
    table(): string {
        return "ResourceURLQuery";
    }
}
