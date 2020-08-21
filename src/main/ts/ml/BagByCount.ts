import { DBObject } from "types/DBObject";
import * as util from "common/util";
import { randomBufferFile } from "file";
import fs from "fs";
import { Bag } from "./Bag";

type Pair = [bigint, number];
export class BagByCount<T extends DBObject<T>, V = string, B extends BagByCount<T, V, B> = any> extends Bag<T, V, B> {
    static readonly CMP = (a: Pair, b: Pair) => {
        let cmp = b[1] - a[1];
        if (cmp === 0) {
            if (a[0] > b[0]) cmp = +1;
            if (a[0] < b[0]) cmp = -1;
            else cmp = 0;
        }

        return cmp;
    }
    toBuffer() {
        const fileData = Buffer.alloc(1 + this.bag.size * (12 + this.lengthBytes));
        fileData[0] = this.lengthBytes;
        let offset = 1;
        const max = 2 ** (this.lengthBytes * 8) - 1;
        for (const [id, count] of [...this.bag.entries()].sort(BagByCount.CMP)) {
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
            for (const [id, count] of [...this.bag.entries()].sort(BagByCount.CMP)) {
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
    build(bag: Map<bigint, number>, lengthBytes: number = 2): B {
        return new BagByCount(this.builder, bag, lengthBytes) as B;
    }
    toString() {
        let str = "";
        for (const [id, count] of [...this.bag.entries()].sort(BagByCount.CMP))
            str += `${id}`.padStart(29, "0") + " " + count.toString(16).padStart(this.lengthBytes * 2, "0") + "\n";

        return str;
    }
}
