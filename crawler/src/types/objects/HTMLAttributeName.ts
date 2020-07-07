import { DBObject } from "../DBObject";

export class HTMLAttributeName extends DBObject<HTMLAttributeName> {
    value: string;

    hashPrefix(): string {
        return "html-attribute-name";
    }
    hashSuffix(): string {
        return this.value;
    }
    getInsertStatement(): string {
        return `insert ignore into HTMLAttributeName(id, value) values ?`
    }
    getInsertParams(): any[] {
        return [this.getID(), this.value];
    }
    table(): string {
        return "HTMLAttributeName";
    }
}
