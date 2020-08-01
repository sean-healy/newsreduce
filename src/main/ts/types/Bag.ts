import { DBObject } from "./DBObject";
import { BinaryBag } from "./BinaryBag";
import { writeBigUInt96BE, CMP_BIG_INT, writeAnyNumberBE, bytesToBigInt, bytesToNumber, iteratorToArray, fancyLog } from "common/util";
import { randomBufferFile } from "file";
import fs from "fs";

export class Bag<T extends DBObject<T>, V = string, B extends Bag<T, V, B> = any> {
    readonly bag: Map<bigint, number>;
    readonly objects: Map<bigint, T>;
    readonly builder: (value: V) => T;
    readonly lengthBytes: number;

    constructor(
        builder: (value: V) => T,
        bag: Map<bigint, number> = new Map(),
        lengthBytes: number = 2,
    ) {
        this.bag = bag;
        this.builder = builder;
        this.objects = new Map();
        this.lengthBytes = lengthBytes;
    }

    register(value: V) {
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
            writeAnyNumberBE(count, this.lengthBytes, fileData, offset);
            offset += this.lengthBytes;
        }

        return fileData;
    }
    toBufferFile() {
        let length = 0;
        let file: string;
        try {
            file = randomBufferFile();
            const fd = fs.openSync(file, "w");
            fs.writeSync(fd, Buffer.of(this.lengthBytes));
            length += 1;
            const ids = [...this.bag.keys()];
            for (const id of ids.sort(CMP_BIG_INT)) {
                fs.writeSync(fd, writeBigUInt96BE(id));
                length += 12;
                const count = Math.min(this.bag.get(id), (1 << this.lengthBytes * 8) - 1);
                writeAnyNumberBE(count, this.lengthBytes);
                length += this.lengthBytes;
            }
            fs.closeSync(fd);
        } catch (e) {
            fancyLog("error during BOW to file:");
            fancyLog(JSON.stringify(e));
            length = -1;
            file = null;
        }

        return { length, file };
    }
    build(bag: Map<bigint, number>, lengthBytes: number): B {
        return new Bag(this.builder, bag, lengthBytes) as B;
    }
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
