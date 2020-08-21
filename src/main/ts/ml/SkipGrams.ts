import { SkipGram } from "types/db-objects/SkipGram";
import { Tokenizer } from "./Tokenizer";
import { BagOfSkipGrams } from "./BagOfSkipGrams";

const ZERO = [0];
export class SkipGrams {
    static generateSkipGramsForDocument(document: string, n: number, skips: number, structured = false) {
        let tokens: string[];
        if (structured) tokens = document.split(/\s+/g);
        else tokens = Tokenizer.tokenizeDocument(document);

        return this.generateSkipGramsForTokens(tokens, n, skips);
    }
    static generateSkipGramsForTokens(tokens: string[], n: number, skips: number, bag = new BagOfSkipGrams()) {
        const skipWindows = SkipGram.getSkipWindows(n, skips);
        const length = tokens.length;
        for (let offset = 0; offset < length; ++offset)
            for (const skipWindow of skipWindows)
                if (offset + skipWindow[n - 2] < length)
                    bag.register(ZERO.concat(skipWindow).map(i => tokens[offset + i]).join(" "));

        return bag;
    }
}
