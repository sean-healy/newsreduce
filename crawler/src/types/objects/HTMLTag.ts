import { DBObject } from "../DBObject";

export class HTMLTag extends DBObject<HTMLTag> {
    value: string;

    hashPrefix(): string {
        return "html-tag";
    }
    hashSuffix(): string {
        return this.value;
    }
    getInsertStatement(): string {
        return `insert ignore into HTMLTag(id, value) values ?`
    }
    getInsertParams(): any[] {
        return [this.getID(), this.value];
    }
    table(): string {
        return "HTMLTag";
    }
}
