import { ResourceURL } from "types/db-objects/ResourceURL";
import { JSDOM } from "jsdom";
import { nodeToHitType } from "types/HitType";
import { VersionType } from "types/db-objects/VersionType";
import { htmlCollectionToArray, wordsFromNode } from "services/resource-processor/functions";
import { BagOfWords } from "types/ml/BagOfWords";
import { HTMLProcessor } from "./HTMLProcessor";
import { BagOfSkipGrams } from "types/ml/BagOfSkipGrams";
import { SkipGrams } from "types/ml/SkipGrams";
import { ResourceProcessor } from "./ResourceProcessor";
import { Dictionary } from "common/util";

const INCLUDE_TAGS = [
    "TITLE",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "FIGCAPTION",
    "BLOCKQUOTE",
    "P",
];

export function getRepresentations(sections: string) {
    const section = sections.split("\n");
    const bagOfWords = new BagOfWords();
    const bagOfSkipGrams = new BagOfSkipGrams();
    for (const sentence of section) {
        const tokens = sentence.split(" ");
        for (const token of tokens)
            bagOfWords.register(token);
        /*const skipGrams34 = SkipGrams.generateSkipGramsForTokens(tokens, 3, 2);
        if (skipGrams34) {
            for (const [skipGram, count] of skipGrams34.bag)
                bagOfSkipGrams.registerID(skipGram, count);
            for (const [key, val] of skipGrams34.objects)
                bagOfSkipGrams.objects.set(key, val);
        }*/
        const skipGrams22 = SkipGrams.generateSkipGramsForTokens(tokens, 2, 1);
        if (skipGrams22) {
            for (const [skipGram, count] of skipGrams22.bag)
                bagOfSkipGrams.registerID(skipGram, count);
            for (const [key, val] of skipGrams22.objects)
                bagOfSkipGrams.objects.set(key, val);
        }
    }
    for (const word of bagOfWords.objects.values())
        word.enqueueInsert({ recursive: true });
    for (const skipGram of bagOfSkipGrams.objects.values())
        skipGram.enqueueInsert({ recursive: true });

    const binaryBagOfWords = bagOfWords.toBinaryBag();
    const binaryBagOfSkipGrams = bagOfSkipGrams.toBinaryBag();
    return { bagOfWords, binaryBagOfWords, bagOfSkipGrams, binaryBagOfSkipGrams };
}

export class ExtractRepresentations extends ResourceProcessor {
    ro() { return false; }
    async apply(resource: ResourceURL, input: Dictionary<Buffer>, time?: number) {
        const buffer = input[VersionType.TOKENS_TXT.filename];
        const rep = getRepresentations(buffer.toString());
        await Promise.all([
            resource.writeVersion(time, VersionType.BAG_OF_WORDS, rep.bagOfWords.toBuffer()),
            resource.writeVersion(time, VersionType.BINARY_BAG_OF_WORDS, rep.binaryBagOfWords.toBuffer()),
            resource.writeVersion(time, VersionType.BAG_OF_SKIP_GRAMS, rep.bagOfSkipGrams.toBuffer()),
            resource.writeVersion(time, VersionType.BINARY_BAG_OF_SKIP_GRAMS, rep.binaryBagOfSkipGrams.toBuffer()),
        ]);
    }
    from() {
        return new Set([VersionType.TOKENS_TXT.filename]);
    }
    to() {
        return new Set([
            VersionType.BAG_OF_WORDS.filename,
            VersionType.BINARY_BAG_OF_WORDS.filename,
            VersionType.BAG_OF_SKIP_GRAMS.filename,
            VersionType.BINARY_BAG_OF_SKIP_GRAMS.filename,
        ]);
    }
}
