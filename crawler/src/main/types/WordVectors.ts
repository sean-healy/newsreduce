import { GenericConstructor } from "./GenericConstructor";
import readline from "readline";
import fs from "fs";
import { WordVector, BYTES_PER_FLOAT } from "./objects/WordVector";
import { CMP_BIG_INT } from "common/util";

export class WordVectors extends GenericConstructor<WordVectors> {
    readonly vectors: Map<bigint, WordVector>;

    toString() {
        let s = "";
        for (const id of [...this.vectors.keys()].sort(CMP_BIG_INT)) {
            s += `${id}`.padStart(29, "0") + " ";
            s += " " + this.vectors.get(id).v300_fast_text.toString("base64");
            s += "\n";
        }

        return s;
    }

    static async fromPath(path: string) {
        const input = fs.createReadStream(path);
        const readInterface = readline.createInterface({ input });
        const vectors = new Map<bigint, WordVector>();
        let firstRowParsed = false;
        let words: number;
        let dimensions: number;
        readInterface.on("line", line => {
            if (firstRowParsed) {
                const vector = WordVector.fromString(line);
                const wordID = vector.word.getID();
                vectors.set(wordID, vector);
            } else {
                const parts = line.match("^([0-9]+) ([0-9]+)$");
                if (parts) {
                    firstRowParsed = true;
                    words = parseInt(parts[1]);
                    dimensions = parseInt(parts[2]);
                } else {
                    const vector = WordVector.fromString(line);
                    const wordID = vector.word.getID();
                    vectors.set(wordID, vector);
                }
            }
        });
        await new Promise(res => readInterface.on("close", res));
        if (vectors.size === 0) throw new Error(`missing data in file: ${words}`);
        for (const [wordID, vector] of vectors.entries())
            if (vector.v300_fast_text.length !== dimensions * BYTES_PER_FLOAT) throw new Error(`invalid dimensions for wordID: ${wordID}`);

        return new WordVectors({ vectors });
    }
}
