import { DBObject } from "types/DBObject";
import { HTMLAttributeName } from "types/db-objects/HTMLAttributeName";
import { HTMLAttributeValue } from "types/db-objects/HTMLAttributeValue";

export class HTMLAttribute extends DBObject<HTMLAttribute> {
    readonly name: HTMLAttributeName;
    readonly value: HTMLAttributeValue;

    hashSuffix(): string {
        return `${this.name.value}\0${this.value.value}`
    }
    insertCols(): string[] {
        return ["id", "name", "value"];
    }
    getInsertParams(): any[] {
        return [this.getID(), this.name.getID(), this.value.getID()];
    }
    table(): string {
        return "HTMLAttribute";
    }
    getDeps() {
        return [this.name, this.value];
    }
}
