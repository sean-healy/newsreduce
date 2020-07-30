import { DBObject } from "./DBObject";
import { BinaryBag } from "./BinaryBag";
import { writeBigUInt96BE, CMP_BIG_INT, writeAnyNumberBE, bytesToBigInt, bytesToNumber, iteratorToArray } from "common/util";

export abstract class Bag<T extends DBObject<T>> {
    readonly bag: Map<bigint, number>;
    readonly objects: Map<bigint, T>;
    readonly builder: (value: string) => T;
    readonly lengthBytes: number;

    constructor(
        builder: (value: string) => T,
        bag: Map<bigint, number> = new Map(),
        lengthBytes: number = 2,
    ) {
        this.bag = bag;
        this.builder = builder;
        this.objects = new Map();
        this.lengthBytes = lengthBytes;
    }

    register(value: string) {
        const obj = this.builder(value);
        const id = obj.getID();
        this.objects.set(id, obj);
        if (this.bag.has(id))
            this.bag.set(id, this.bag.get(id) + 1);
        else this.bag.set(id, 1);
    }
    toBinaryBag() {
        return new BinaryBag(this.builder, new Set(this.bag.keys()));
    }
    toBuffer() {
        const ids = [...this.bag.keys()];
        const fileData = Buffer.alloc(1 + this.bag.size * (12 + this.lengthBytes));
        fileData[0] = this.lengthBytes;
        let offset = 1;
        for (const id of ids.sort(CMP_BIG_INT)) {
            writeBigUInt96BE(id, fileData, offset);
            offset += 12;
            const count = Math.min(this.bag.get(id), (1 << this.lengthBytes * 8) - 1);
            writeAnyNumberBE(count, fileData, offset, this.lengthBytes);
            offset += this.lengthBytes;
        }

        return fileData;
    }
    abstract build(bag: Map<bigint, number>, lengthBytes: number): Bag<T>;
    fromBuffer(buffer: Buffer) {
        const bag = new Map<bigint, number>();
        const bufferLength = buffer.length;
        const lengthBytes = buffer[0];
        let offset = 1;
        while (offset < bufferLength) {
            const id = bytesToBigInt(buffer.slice(offset, offset + 12));
            offset += 12;
            const count = bytesToNumber(buffer.slice(offset, offset + this.lengthBytes));
            offset += this.lengthBytes;
            bag.set(id, count);
        }

        return this.build(bag, lengthBytes);
    }

    toString() {
        const ids = iteratorToArray(this.bag.keys()).sort(CMP_BIG_INT);
        let str = "";
        for (const id of ids)
            str += `${id}`.padStart(29, "0") + " " + this.bag.get(id).toString(16).padStart(this.lengthBytes * 2, "0") + "\n";

        return str;
    }
}
