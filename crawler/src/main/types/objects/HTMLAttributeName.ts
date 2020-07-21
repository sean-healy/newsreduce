import { DBObject } from "types/DBObject";

export class HTMLAttributeName extends DBObject<HTMLAttributeName> {
    readonly value: string;

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
        return "HTMLAttributeName";
    }
}
