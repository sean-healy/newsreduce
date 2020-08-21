import { ResourceURL } from "types/db-objects/ResourceURL";
import { VersionType } from "types/db-objects/VersionType";
import { BagOfWords } from "ml/BagOfWords";
import { ResourceProcessor } from "./ResourceProcessor";
import { Dictionary } from "common/util";
import { InputCache } from "./functions";

export function getRepresentations(cache: InputCache) {
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
    const bagOfWords = new BagOfWords();
    for (const sentence of tokens)
        for (const token of sentence)
            bagOfWords.register(token);
    for (const word of bagOfWords.objects.values())
        word.enqueueInsert({ recursive: true });
    return bagOfWords;
}

export class ExtractBOW extends ResourceProcessor {
    async apply(resource: ResourceURL, input: Dictionary<InputCache>, time?: number) {
        const cache = input[this.from()[0].filename];
        const bow = getRepresentations(cache);
        await Promise.all([
            resource.writeVersion(time, this.to()[0], bow.toBuffer()),
            resource.writeVersion(time, this.to()[1], bow.toBinaryBag().toBuffer()),
        ]);
    }
    from() {
        return [VersionType.TOKENS];
    }
    to() {
        return [VersionType.BAG_OF_WORDS, VersionType.BINARY_BAG_OF_WORDS];
    }

    static Reduced() {
        return class ReducedExtractBOW extends ExtractBOW {
            from() {
                return [VersionType.REDUCED_TOKENS]
            }
            to() {
                return [VersionType.REDUCED_BAG_OF_WORDS, VersionType.REDUCED_BINARY_BAG_OF_WORDS];
            }
        }
    }
}
