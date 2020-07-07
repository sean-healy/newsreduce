import { DBObject } from "../DBObject";

export class HTMLAttributeValue extends DBObject<HTMLAttributeValue> {
    value: string;

    hashPrefix(): string {
        return "html-attribute-value";
    }
    hashSuffix(): string {
        return this.value;
    }
    getInsertStatement(): string {
        return `insert ignore into HTMLAttributeValue(id, value) values ?`
    }
    getInsertParams(): any[] {
        return [this.getID(), this.value];
    }
    table(): string {
        return "HTMLAttributeValue";
    }
}
