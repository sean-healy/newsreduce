import { ResourceURL } from "types/db-objects/ResourceURL";
import { VersionType } from "types/db-objects/VersionType";
import { ResourceProcessor } from "./ResourceProcessor";
import { Dictionary } from "common/util";
import { Word } from "types/db-objects/Word";
import { Tokenizer } from "types/ml/Tokenizer";
import { selectStopWords } from "data";

export class ExtractTokens2 extends ResourceProcessor {
    ro() { return true; }
    static STOP_WORDS: Map<bigint, number>;
    static STOP_WORDS_LAST_FETCHED: number = 0;
    static async getStopWords() {
        const now = Date.now();
        if (now - ExtractTokens2.STOP_WORDS_LAST_FETCHED > 60000) {
            ExtractTokens2.STOP_WORDS = await selectStopWords();
            ExtractTokens2.STOP_WORDS_LAST_FETCHED = now;
        }

        return ExtractTokens2.STOP_WORDS;
    }
    static async normaliseBufferText(buffer: Buffer) {
        const lines = buffer.toString().split(/\n+/g);
        const normalisedWordIDMatrix: bigint[][]  = [];
        const normalisedWordIDs = new Set<bigint>();
        const stopwords = await this.getStopWords();
        for (const line of lines) {
            if (!line) continue;
            const words = line.split(/\s+/g);
            const normalisedWordIDRow: bigint[] = [];
            for (const word of words) {
                const wordID = new Word(word).getID();
                if (!stopwords.has(wordID)) {
                    const simplifiedWordID = Tokenizer.simplify(wordID)
                    normalisedWordIDRow.push(simplifiedWordID);
                    normalisedWordIDs.add(simplifiedWordID);
                }
            }
            if (normalisedWordIDRow.length)
                normalisedWordIDMatrix.push(normalisedWordIDRow);
        }
        const words = await new Word().bulkSelect([...normalisedWordIDs], ["id", "value"]);
        const wordsByID = new Map<bigint, string>();
        for (const row of words) wordsByID.set(BigInt(row.id), row.value);
        const normalisedLines: string[]  = [];
        for (const row of normalisedWordIDMatrix) {
            const normalisedWordRow: string[]  = [];
            for (const wordID of row) {
                const word = wordsByID.get(wordID);
                normalisedWordRow.push(word);
            }
            normalisedLines.push(normalisedWordRow.join(" "));
        }
        const normalisedText = normalisedLines.join("\n");

        return normalisedText;
    }
    async apply(resource: ResourceURL, input: Dictionary<Buffer>, time: number) {
        const buffer = input[VersionType.TOKENS_TXT.filename];
        const normalisedText = await ExtractTokens2.normaliseBufferText(buffer);
        await resource.writeVersion(time, VersionType.MINIMAL_TOKENS, normalisedText);
    }
    from() {
        return new Set([VersionType.TOKENS_TXT.filename]);
    }
    to() {
        return new Set([
            VersionType.MINIMAL_TOKENS.filename,
        ]);
    }
}
