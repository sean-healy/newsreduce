import { DBObject } from "./DBObject";
import { CMP_BIG_INT, writeBigUInt96BE, bytesToBigInt, iteratorToArray } from "common/util";
import { Word } from "./objects/Word";

export class BinaryBag<T extends DBObject<T>, V = string> {
    readonly bag: Set<bigint>;
    readonly objects: Map<bigint, T>;
    readonly builder: (value: V) => T;

    constructor(
        builder: (value: V) => T,
        bag: Set<bigint> = new Set(),
    ) {
        this.bag = bag;
        this.builder = builder;
        this.objects = new Map();
    }

    register(value: V) {
        const obj = this.builder(value);
        const wordID = obj.getID();
        this.bag.add(wordID);
    }
    toBuffer() {
        const ids = [...this.bag.keys()];
        const fileData = Buffer.alloc(this.bag.size * 12);
        let offset = 0;
        for (const id of ids.sort(CMP_BIG_INT)) {
            writeBigUInt96BE(id, fileData, offset);
            offset += 12;
        }

        return fileData;
    }
    fromBuffer(buffer: Buffer) {
        const bag = new Set<bigint>();
        const bufferLength = buffer.length;
        let offset = 0;
        while (offset < bufferLength) {
            const id = bytesToBigInt(buffer.slice(offset, offset + 12));
            offset += 12;
            bag.add(id);
        }

        return new BinaryBag(this.builder, bag);
    }

    toString() {
        const ids = iteratorToArray(this.bag.keys()).sort(CMP_BIG_INT);
        let str = "";
        for (const id of ids)
            str += `${id}`.padStart(29, "0") + "\n";

        return str;
    }

    static ofWords() {
        return new BinaryBag(value => new Word(value));
    }
}
