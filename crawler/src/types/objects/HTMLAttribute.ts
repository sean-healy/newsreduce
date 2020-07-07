import { DBObject } from "../DBObject";
import { HTMLAttributeName } from "./HTMLAttributeName";
import { HTMLAttributeValue } from "./HTMLAttributeValue";

export class HTMLAttribute extends DBObject<HTMLAttribute> {
    name: HTMLAttributeName;
    value: HTMLAttributeValue;

    hashPrefix(): string {
        return "html-attribute";
    }
    hashSuffix(): string {
        return `${this.name.value}\0${this.value.value}`
    }
    getInsertStatement(): string {
        return `insert ignore into HTMLAttribute(id, name, value) values ? `
    }
    getInsertParams(): any[] {
        return [this.getID(), this.name.getID(), this.value.getID()];
    }
    table(): string {
        return "HTMLAttribute";
    }
}
