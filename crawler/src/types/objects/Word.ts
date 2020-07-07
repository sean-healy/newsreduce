import { DBObject } from "../DBObject";

export class Word extends DBObject<Word> {
    value: string;

    hashPrefix(): string {
        return "word";
    }
    hashSuffix(): string {
        return this.value;
    }
    getInsertStatement(): string {
        return `insert ignore into Word(id, value) values ?`
    }
    getInsertParams(): any[] {
        return [this.getID(), this.value];
    }
    table(): string {
        return "Word";
    }
    idCol(): string {
        return "resource";
    }
}
