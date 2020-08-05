import { SimpleHashObject } from "./SimpleHashObject";
import { DBObject } from "types/DBObject";

export class Word extends SimpleHashObject<Word> {
    table(): string {
        return "Word";
    }
}

export class WordID extends DBObject<WordID> {
    readonly id: bigint;

    constructor(id: bigint) {
        super();
        this.id = id;
    }

    getID() {
        return this.id;
    }

    async enqueueInsert() {
        throw new Error("Method not implemented.");
    }
    getInsertParams(): any[] {
        throw new Error("Method not implemented.");
    }
    table(): string {
        throw new Error("Method not implemented.");
    }
    insertCols(): string[] {
        throw new Error("Method not implemented.");
    }
}
