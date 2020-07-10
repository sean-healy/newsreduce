import { Word } from "types/objects/Word";
import { HitList } from "types/HitList";
import { HitType } from "types/HitType";
import { Hit } from "types/Hit";
import { CMP_BIG_INT, writeBigUInt96BE } from "common/util";

const POSITION_BITS = 4;

export class Hits {
    wordHits: Map<bigint, HitList>;
    words: Map<bigint, Word>;

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
            const wordHits = this.wordHits.get(wordID).sort().slice(0, (1 << 16) - 1);
            fileData.writeUInt16BE(wordHits.length, offset);
            offset += 2;
            Buffer.from(wordHits).copy(fileData, offset);
            offset += wordHits.length;
        }
    }
}
