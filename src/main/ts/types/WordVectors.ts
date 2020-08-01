import { GenericConstructor } from "./GenericConstructor";
import readline from "readline";
import fs from "fs";
import { WordVector, BYTES_PER_FLOAT } from "./objects/WordVector";
import { CMP_BIG_INT, writeBigUInt96BE } from "common/util";
import { randomBufferFile } from "file";
import { ResourceURL } from "./objects/ResourceURL";

export class WordVectors extends GenericConstructor<WordVectors> {
    readonly vectors: Map<bigint, WordVector>;

    toString() {
        let s = "";
        for (const id of [...this.vectors.keys()].sort(CMP_BIG_INT)) {
            s += `${id}`.padStart(29, "0") + " ";
            s += " " + this.vectors.get(id).vector.value.toString("base64");
            s += "\n";
        }

        return s;
    }

    async toBufferFile() {
        const file = randomBufferFile();
        const dst = fs.createWriteStream(file);
        const ids = [...this.vectors.keys()].sort(CMP_BIG_INT);
        for (const id of ids) {
            const vector = this.vectors.get(id);
            dst.write(writeBigUInt96BE(id))
            dst.write(vector.vector.value)
        }
        dst.end();
        await new Promise(res => dst.on("finish", res));

        return file;
    }

    static async fromPath(path: string, source: ResourceURL) {
        return this.fromStream(fs.createReadStream(path), source);
    }
    static async fromStream(input: NodeJS.ReadableStream, source: ResourceURL) {
        const readInterface = readline.createInterface({ input });
        const vectors = new Map<bigint, WordVector>();
        let firstRowParsed = false;
        let words: number;
        let dimensions: number;
        readInterface.on("line", line => {
            if (firstRowParsed) {
                const vector = WordVector.fromString(line, source);
                const wordID = vector.word.getID();
                vectors.set(wordID, vector);
            } else {
                const parts = line.match("^([0-9]+) ([0-9]+)$");
                if (parts) {
                    firstRowParsed = true;
                    words = parseInt(parts[1]);
                    dimensions = parseInt(parts[2]);
                } else {
                    const vector = WordVector.fromString(line, source);
                    const wordID = vector.word.getID();
                    vectors.set(wordID, vector);
                }
            }
        });
        await new Promise(res => readInterface.on("close", res));
        if (vectors.size === 0) throw new Error(`missing data in file: ${words}`);
        for (const [wordID, vector] of vectors.entries())
            if (vector.vector.value.length !== dimensions * BYTES_PER_FLOAT) throw new Error(`invalid dimensions for wordID: ${wordID}`);

        return new WordVectors({ vectors });
    }
}
