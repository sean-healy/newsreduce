import { Bag } from "types/Bag";
import { Word } from "types/objects/Word";

export class BagOfWords extends Bag<Word> {
    constructor(bag: Map<bigint, number> = new Map(), lengthBytes: number = 2) {
        super(value => new Word(value), bag, lengthBytes);
    }
    build(bag: Map<bigint, number>, lengthBytes: number) {
        return new BagOfWords(bag, lengthBytes);
    }
}
