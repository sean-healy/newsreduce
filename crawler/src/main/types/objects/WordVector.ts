import { DBObject } from "types/DBObject";
import { Word } from "./Word";
import { WordVectorSource } from "./WordVectorSource";
import { Vector } from "./Vector";
import { ResourceURL } from "./ResourceURL";

export const BYTES_PER_FLOAT = 2;
const UNIQUE_VALUES = 1 << (BYTES_PER_FLOAT << 3);
const MIN_VALUE = - (UNIQUE_VALUES >> 1);
const MAX_VALUE = (UNIQUE_VALUES >> 1) - 1;

export class WordVector extends DBObject<WordVector> {
    readonly word: Word;
    source: WordVectorSource;
    readonly vector: Vector;

    getDeps() {
        return [this.word, this.source, this.vector];
    }
    getInsertParams(): any[] {
        return [this.word.getID(), this.source.getID(), this.vector.getID()];
    }
    table(): string {
        return "WordVector";
    }
    insertCols(): string[] {
        return ["word", "source", "vector"];
    }

    static vectorToBuffer(vector: number[], buffer = Buffer.alloc(vector.length * 2)) {
        let offset = 0;
        for (const value of vector)
            offset = WordVector.floatToBytes(value, buffer, offset).offset;

        return buffer;
    }

    static floatToBytes(float: number, buffer = Buffer.alloc(2), offset = 0) {
        let integer = Math.round(float * 10000)
        if (integer < MIN_VALUE) integer = MIN_VALUE;
        if (integer > MAX_VALUE) integer = MAX_VALUE;
        let naturalNumber = integer - MIN_VALUE;
        buffer.writeUInt16BE(naturalNumber, offset);
        offset += 2;

        return { buffer, offset };
    }

    static floatFromBytes(buffer: Buffer, offset = 0) {
        const naturalNumber = buffer.readUInt16BE(offset);
        offset += 2;
        let integer = naturalNumber + MIN_VALUE;
        if (integer < MIN_VALUE) integer = MIN_VALUE;
        if (integer > MAX_VALUE) integer = MAX_VALUE;

        return { integer, offset };
    }

    static fromString(input: string, source: ResourceURL) {
        if (input === null) throw new Error(`word vector null: ${input}`);
        if (input === undefined) throw new Error(`word vector undefined: ${input}`);
        if (input === "") throw new Error(`word vector empty: ${input}`);
        const tokens = input.split(" ");
        if (tokens.length === 0) throw new Error(`word vector tokens length empty: ${input}`);
        let wordValue = tokens[0];
        if (wordValue === "") throw new Error(`word vector word empty: ${input}`);
        const word = new Word(wordValue.toLowerCase());
        const vector = new Vector(this.vectorToBuffer(tokens.slice(1).map(s => parseFloat(s))));
        return new WordVector({ vector, word, source: new WordVectorSource({ resource: source }) });
    }
}
