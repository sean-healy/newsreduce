import { Bag } from "types/ml/Bag";
import { Word } from "types/db-objects/Word";

export class BagOfWords extends Bag<Word, string, BagOfWords> {
    constructor(bag: Map<bigint, number> = new Map(), lengthBytes: number = 2) {
        super(value => new Word(value), bag, lengthBytes);
    }
    build(bag: Map<bigint, number>, lengthBytes: number) {
        return new BagOfWords(bag, lengthBytes);
    }
}
