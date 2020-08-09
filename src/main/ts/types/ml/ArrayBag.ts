import { DBObject } from "types/DBObject";
import * as util from "common/util";
import { randomBufferFile } from "file";
import fs from "fs";
import { Bag } from "./Bag";
import { BinaryBag } from "./BinaryBag";

type Row = [bigint, number];
export class ArrayBag<T extends DBObject<T>, V = string> extends Bag<T, V, ArrayBag<T, V>> {
    readonly array: Row[];

    constructor(array: Row[], lengthBytes: number = 2) {
        super(null, null);
        this.array = array;
        this.lengthBytes = lengthBytes;
    }

    register() {
        throw new Error("Array bags should only be used for writing to disk.");
    }
    registerID() {
        throw new Error("Array bags should only be used for writing to disk.");
    }
    toBinaryBag(): BinaryBag<T, V> {
        throw new Error("Array bags should only be used for writing to disk.");
    }
    build(): ArrayBag<T, V> {
        throw new Error("Array bags should only be used for writing to disk.");
    }
    union<T extends DBObject<T>, V, B extends Bag<T, V, B>>(): B {
        throw new Error("Array bags should only be used for writing to disk.");
    }
    toBuffer() {
        const fileData = Buffer.alloc(1 + this.array.length * (12 + this.lengthBytes));
        fileData[0] = this.lengthBytes;
        let offset = 1;
        const max = 2 ** (this.lengthBytes * 8) - 1;
        for (const [id, count] of this.array) {
            util.writeBigUInt96BE(id, fileData, offset);
            offset += 12;
            util.writeAnyNumberBE(Math.min(count, max), this.lengthBytes, fileData, offset);
            offset += this.lengthBytes;
        }

        return fileData;
    }
    toBufferFile() {
        let length = 0;
        let file: string;
        const max = 2 ** (this.lengthBytes * 8) - 1;
        try {
            file = randomBufferFile();
            const fd = fs.openSync(file, "w");
            const lengthBytesBuffer = Buffer.alloc(1);
            lengthBytesBuffer[0] = this.lengthBytes;
            fs.writeSync(fd, lengthBytesBuffer);
            length += 1;
            for (const [id, count] of this.array) {
                fs.writeSync(fd, util.writeBigUInt96BE(id));
                length += 12;
                fs.writeSync(fd, util.writeAnyNumberBE(Math.min(count, max), this.lengthBytes));
                length += this.lengthBytes;
            }
            fs.closeSync(fd);
        } catch (e) {
            util.fancyLog("error during BOW to file:");
            util.fancyLog(JSON.stringify(e));
            length = -1;
            file = null;
        }

        return { length, file };
    }
    fromBuffer(buffer: Buffer) {
        const bag: Row[] = [];
        const bufferLength = buffer.length;
        const lengthBytes = buffer[0];
        let offset = 1;
        while (offset < bufferLength) {
            const idBytes = buffer.slice(offset, offset + 12);
            const id = util.bytesToBigInt(idBytes);
            offset += 12;
            const countBytes = buffer.slice(offset, offset + lengthBytes)
            const count = util.bytesToNumber(countBytes);
            offset += lengthBytes;
            bag.push([id, count]);
        }

        return new ArrayBag<T, V>(bag, lengthBytes);
    }

    toString() {
        let str = "";
        for (const [id, count] of this.array)
            str += `${id}`.padStart(29, "0") + " " + count.toString(16).padStart(this.lengthBytes * 2, "0") + "\n";

        return str;
    }

    calculateAndSetLengthBytes() {
        let max = 1;
        for (const [, count] of this.array) if (count > max) max = count;
        const range = max + 1;
        const lengthBytes = Math.ceil((Math.log(range) / Math.log(2)) / 8);
        this.lengthBytes = lengthBytes;
    }
}
