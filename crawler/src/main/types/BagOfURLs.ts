import { Bag } from "types/Bag";
import { ResourceURL } from "types/objects/ResourceURL";

export class BagOfURLs extends Bag<ResourceURL> {
    constructor(bag: Map<bigint, number>, lengthBytes: number = 2) {
        super(value => new ResourceURL(value), bag, lengthBytes);
    }
    build(bag: Map<bigint, number>, lengthBytes: number) {
        return new BagOfURLs(bag, lengthBytes);
    }
}
