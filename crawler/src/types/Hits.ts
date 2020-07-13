import { Word } from "types/objects/Word";
import { HitList } from "types/HitList";
import { HitType } from "types/HitType";
import { Hit } from "types/Hit";
import { CMP_BIG_INT, writeBigUInt96BE, iteratorToArray, bytesToBigInt } from "common/util";

const POSITION_BITS = 4;

export class Hits {
    readonly wordHits: Map<bigint, HitList>;
    readonly words: Map<bigint, Word>;
    constructor(wordHits?: Map<bigint, HitList>) {
        if (wordHits) this.wordHits = wordHits;
        else this.wordHits = new Map();
        this.words = new Map();
    }

    register(value: string, n: number, of: number, type: HitType) {
        const wordObj = new Word(value);
        const wordID = wordObj.getID();
        let wordHits: HitList;
        if (this.wordHits.has(wordID))
            wordHits = this.wordHits.get(wordID);
        else {
            wordHits = [];
            this.wordHits.set(wordID, wordHits);
            this.words.set(wordID, wordObj);
        }
        const position = Math.floor((n / of) * (1 << POSITION_BITS));

        wordHits.push(new Hit(type, position));
    }

    toBuffer() {
        let bytes = 0;
        // 12 bytes pet word IDs
        bytes += this.words.size * 12;
        // 2 bytes pet word (for length of hit list).
        bytes += this.words.size * 2;
        let wordIDs: bigint[] = new Array(this.words.size);
        let i = 0;
        this.wordHits.forEach((hits, wordID) => {
            // 1 byte per hit
            bytes += hits.length;
            wordIDs[i++] = wordID;
        });
        const fileData = Buffer.alloc(bytes);
        let offset = 0;
        for (const wordID of wordIDs.sort(CMP_BIG_INT)) {
            writeBigUInt96BE(wordID, fileData, offset);
            offset += 12;
            const wordHits = this.wordHits.get(wordID).sort().slice(0, (1 << 16) - 1)
                .map(hit => hit.toByte());
            fileData.writeUInt16BE(wordHits.length, offset);
            offset += 2;
            Buffer.from(wordHits).copy(fileData, offset);
            offset += wordHits.length;
        }

        return fileData;
    }

    toString() {
        const wordIDs = iteratorToArray(this.wordHits.keys()).sort(CMP_BIG_INT);
        let str = "";
        for (const wordID of wordIDs) {
            str += `${wordID}`.padStart(29, "0") + " ";
            const bytes = this.wordHits.get(wordID).map(hit => hit.toByte());
            str += Buffer.of(...bytes).toString("hex") + "\n";
        }

        return str;
    }

    static fromBuffer(buffer: Buffer) {
        const hits = new Map<bigint, HitList>();
        const bufferLength = buffer.length;
        let offset = 0;
        while (offset < bufferLength) {
            const wordID = bytesToBigInt(buffer.slice(offset, offset + 12));
            offset += 12;
            const hitsLength = buffer.slice(offset, offset + 2).readUInt16BE();
            offset += 2;
            const wordHits = new Array<Hit>(hitsLength);
            for (let i = 0; i < hitsLength; ++i) {
                const hit = Hit.fromByte(buffer[offset + i]);
                wordHits[i] = hit;
            }
            offset += hitsLength;
            hits.set(wordID, wordHits);
        }

        return new Hits(hits);
    }
}
