import { DBObject } from "types/DBObject";
import { Word } from "types/db-objects/Word";
import { ConstructorArg0 } from "common/util";

export class WordFrequency extends DBObject<WordFrequency> {
    readonly word: Word;
    readonly frequency: number;

    constructor(arg0?: ConstructorArg0<WordFrequency>, frequency?: number) {
        if (typeof arg0 === "string") super({ word: new Word(arg0), frequency });
        else if (!arg0) super();
        else super(arg0);
    }

    insertCols(): string[] {
        return ["word", "frequency"];
    }
    getInsertParams(): any[] {
        return [this.word.getID(), this.frequency];
    }
    table(): string {
        return "WordFrequency";
    }
    getDeps() {
        return [this.word];
    }
}

export class WordFrequencyByID extends WordFrequency {
    readonly wordID: bigint;
    readonly frequency: number;

    constructor(wordID: bigint, frequency: number) {
        super();
        this.wordID = wordID;
        this.frequency = frequency;
    }

    insertCols(): string[] {
        return ["word", "`frequency`"];
    }
    getInsertParams(): any[] {
        return [this.wordID, this.frequency];
    }
    table(): string {
        return "WordFrequency";
    }
    getDeps() {
        return [];
    }
}