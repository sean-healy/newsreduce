import { DBObject } from "types/DBObject";
import { Word } from "types/db-objects/Word";
import { ConstructorArg0 } from "utils/alpha";
import { Predicate } from "./Predicate";

export class ConditionalWordFrequency extends DBObject<ConditionalWordFrequency> {
    readonly predicate: Predicate;
    readonly polarity: boolean;
    readonly word: Word;
    readonly frequency: number;

    constructor(arg0?: ConstructorArg0<ConditionalWordFrequency>, frequency?: number) {
        if (typeof arg0 === "string") super({ word: new Word(arg0), frequency });
        else if (!arg0) super();
        else super(arg0);
    }

    insertCols(): string[] {
        return ["predicate", "polarity", "word", "frequency"];
    }
    getInsertParams(): any[] {
        return [this.word.getID(), this.frequency];
    }
    table(): string {
        return "ConditionalWordFrequency";
    }
    getDeps() {
        return [this.word, this.predicate];
    }
}

export class ConditionalWordFrequencyByID extends ConditionalWordFrequency {
    readonly predicateID: bigint;
    readonly polarity: boolean;
    readonly wordID: bigint;
    readonly frequency: number;

    constructor(predicateID: bigint, polarity: boolean, wordID: bigint, frequency: number) {
        super();
        this.wordID = wordID;
        this.predicateID = predicateID;
        this.polarity = polarity;
        this.frequency = frequency;
    }
    getInsertParams(): any[] {
        return [this.predicateID, this.polarity, this.wordID, this.frequency];
    }
    getDeps() {
        return [];
    }
}