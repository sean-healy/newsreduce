import { ResourceURL } from "types/db-objects/ResourceURL";
import { VersionType } from "types/db-objects/VersionType";
import { ResourceProcessor } from "./ResourceProcessor";
import { Dictionary } from "common/util";
import { Word } from "types/db-objects/Word";
import { Tokenizer } from "ml/Tokenizer";
import { selectStopWords } from "data";
import { InputCache } from "./functions";

export class ExtractReducedTokens extends ResourceProcessor {
    ro() { return true; }
    static STOP_WORDS: Map<bigint, number>;
    static STOP_WORDS_LAST_FETCHED: number = 0;
    static async getStopWords() {
        const now = Date.now();
        if (now - ExtractReducedTokens.STOP_WORDS_LAST_FETCHED > 60000) {
            ExtractReducedTokens.STOP_WORDS = await selectStopWords();
            ExtractReducedTokens.STOP_WORDS_LAST_FETCHED = now;
        }

        return ExtractReducedTokens.STOP_WORDS;
    }
    static async normaliseBufferText(cache: InputCache) {
        let tokens = cache.tokens;
        if (!tokens) {
            let string = cache.string;
            if (!string) {
                string = cache.buffer.toString();
                cache.string = string;
            }
            tokens = string.split(/\n+/).map(sentence => sentence.split(/ +/g));
            cache.tokens = tokens;
        }
        const normalisedWordIDMatrix: bigint[][]  = [];
        const normalisedWordIDs = new Set<bigint>();
        const stopwords = await this.getStopWords();
        for (const sentence of tokens) {
            if (!sentence || !sentence.length) continue;
            const normalisedWordIDRow: bigint[] = [];
            for (const token of sentence) {
                const wordID = new Word(token).getID();
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
    async apply(resource: ResourceURL, input: Dictionary<InputCache>, time: number) {
        const cache= input[VersionType.TOKENS.filename];
        const normalisedText = await ExtractReducedTokens.normaliseBufferText(cache);
        await resource.writeVersion(time, VersionType.REDUCED_TOKENS, normalisedText);
    }
    from() {
        return [VersionType.TOKENS];
    }
    to() {
        return [VersionType.REDUCED_TOKENS];
    }
}
