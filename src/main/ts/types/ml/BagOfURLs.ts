import { Bag } from "types/ml/Bag";
import { ResourceURL } from "types/db-objects/ResourceURL";

export class BagOfURLs extends Bag<ResourceURL, string, BagOfURLs> {
    constructor(bag: Map<bigint, number> = new Map(), lengthBytes: number = 2) {
        super(value => new ResourceURL(value), bag, lengthBytes);
    }
    build(bag: Map<bigint, number>, lengthBytes: number) {
        return new BagOfURLs(bag, lengthBytes);
    }
}
