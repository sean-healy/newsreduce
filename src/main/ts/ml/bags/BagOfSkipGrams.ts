import { Bag } from "ml/bags/Bag";
import { SkipGram } from "types/db-objects/SkipGram";

export class BagOfSkipGrams extends Bag<SkipGram, string, BagOfSkipGrams> {
    constructor(bag: Map<bigint, number> = new Map(), lengthBytes: number = 2) {
        super(value => new SkipGram(value), bag, lengthBytes);
    }
    build(bag: Map<bigint, number>, lengthBytes: number) {
        return new BagOfSkipGrams(bag, lengthBytes);
    }
}
