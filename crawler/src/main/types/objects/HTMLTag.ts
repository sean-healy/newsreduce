import { DBObject } from "types/DBObject";

export class HTMLTag extends DBObject<HTMLTag> {
    readonly value: string;

    hashPrefix(): string {
        return "html-tag";
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
        return "HTMLTag";
    }
}
