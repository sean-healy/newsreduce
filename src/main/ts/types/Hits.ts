import { HitList } from "types/HitList";
import { HitType } from "types/HitType";
import { Hit } from "types/Hit";
import {
    CMP_BIG_INT,
    writeBigUInt96BE,
    iteratorToArray,
    bytesToBigInt,
    writeAnyNumberBE,
    bytesToNumber,
    fancyLog,
} from "common/util";
import { DBObject } from "./DBObject";

const POSITION_BITS = 4;

export abstract class Hits<T extends DBObject<T>> {
    readonly hits: Map<bigint, HitList>;
    readonly objects: Map<bigint, DBObject<T>>;
    readonly builder: (value: string) => T;
    readonly lengthBytes: number;
    constructor(
        builder: (value: string) => T,
        lengthBytes: number,
        hits: Map<bigint, HitList> = new Map(),
    ) {
        this.hits = hits;
        this.builder = builder;
        this.lengthBytes = lengthBytes;
        this.objects = new Map();
    }

    register(value: string, n: number, of: number, type: HitType) {
        let obj: DBObject<T>;
        try {
            obj = this.builder(value);
        } catch (e) {
            fancyLog("caught exception while gathering hits");
            fancyLog(JSON.stringify(e));
            return n;
        }
        const id = obj.getID();
        let hits: HitList;
        if (this.hits.has(id))
            hits = this.hits.get(id);
        else {
            hits = [];
            this.hits.set(id, hits);
            this.objects.set(id, obj);
        }
        const position = Math.floor((n / of) * (1 << POSITION_BITS));

        hits.push(new Hit(type, position));

        return n + 1;
    }

    toBuffer() {
        let bytes = 0;
        // 12 bytes per ID
        bytes += this.hits.size * 12;
        // N bytes per ID (for length of hit list).
        bytes += this.hits.size * this.lengthBytes;
        const ids = [...this.hits.keys()];
        // 1 byte per hit
        bytes += [...this.hits.values()].map(hits => hits.length).reduce((a, b) => a + b, 0);
        const fileData = Buffer.alloc(bytes);
        let offset = 0;
        for (const id of ids.sort(CMP_BIG_INT)) {
            writeBigUInt96BE(id, fileData, offset);
            offset += 12;
            const hits = this.hits.get(id).sort().slice(0, (1 << this.lengthBytes * 8) - 1)
                .map(hit => hit.toByte());
            const length = Math.min(hits.length, (1 << this.lengthBytes * 8) - 1);
            writeAnyNumberBE(length, this.lengthBytes, fileData, offset);
            offset += this.lengthBytes;
            Buffer.from(hits).copy(fileData, offset);
            offset += hits.length;
        }

        return fileData;
    }

    toString() {
        const wordIDs = iteratorToArray(this.hits.keys()).sort(CMP_BIG_INT);
        let str = "";
        for (const id of wordIDs) {
            str += `${id}`.padStart(29, "0") + " ";
            const bytes = this.hits.get(id).map(hit => hit.toByte());
            str += Buffer.of(...bytes).toString("hex") + "\n";
        }

        return str;
    }

    abstract build(hits: Map<bigint, HitList>): Hits<T>;
    fromBuffer(buffer: Buffer) {
        const hits = new Map<bigint, HitList>();
        const bufferLength = buffer.length;
        let offset = 0;
        while (offset < bufferLength) {
            const id = bytesToBigInt(buffer.slice(offset, offset + 12));
            offset += 12;
            const hitsLength = bytesToNumber(buffer.slice(offset, offset + this.lengthBytes));
            offset += this.lengthBytes;
            const itemHits = new Array<Hit>(Number(hitsLength));
            for (let i = 0; i < hitsLength; ++i) {
                const hit = Hit.fromByte(buffer[offset + i]);
                itemHits[i] = hit;
            }
            offset += hitsLength;
            hits.set(id, itemHits);
        }

        return this.build(hits);
    }
}
