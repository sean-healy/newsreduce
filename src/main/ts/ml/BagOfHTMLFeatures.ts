import { Bag } from "ml/Bag";
import { HTMLFeature } from "types/db-objects/HTMLFeature";

export class BagOfHTMLFeatures extends Bag<HTMLFeature, string, BagOfHTMLFeatures> {
    constructor(bag: Map<bigint, number> = new Map(), lengthBytes: number = 2) {
        super(value => new HTMLFeature(value), bag, lengthBytes);
    }
    build(bag: Map<bigint, number>, lengthBytes: number) {
        return new BagOfHTMLFeatures(bag, lengthBytes);
    }
}
