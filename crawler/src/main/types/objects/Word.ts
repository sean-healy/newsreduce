import { DBObject } from "types/DBObject";

export class Word extends DBObject<Word> {
    readonly value: string;

    constructor(value?: string) {
        if (value) super({ value });
    }

    hashPrefix(): string {
        return "word";
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
        return "Word";
    }
    idCol(): string {
        return "id";
    }
}
