import { ResourceURL } from "types/db-objects/ResourceURL";
import { VersionType } from "types/db-objects/VersionType";
import { BagOfSkipGrams } from "ml/bags/BagOfSkipGrams";
import { SkipGrams } from "ml/SkipGrams";
import { ResourceProcessor } from "./ResourceProcessor";
import { Dictionary } from "utils/alpha";
import { InputCache } from "./functions";

export function getSkipGrams(cache: InputCache, n: number, skips: number) {
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
    const bag = new BagOfSkipGrams();
    for (const sentence of tokens) {
        const skipGrams = SkipGrams.generateSkipGramsForTokens(sentence, n, skips);
        if (skipGrams) {
            for (const [skipGram, count] of skipGrams.bag)
                bag.registerID(skipGram, count);
            for (const skipGram of skipGrams.objects.values())
                skipGram.enqueueInsert({ recursive: true });
        }
    }

    return bag;
}


export class ExtractBOSG extends ResourceProcessor {
    async apply(resource: ResourceURL, input: Dictionary<InputCache>, time?: number) {
        const cache = input[this.from()[0].filename];
        const bosg = getSkipGrams(cache, 2, 1);
        await Promise.all([
            resource.writeVersion(time, this.to()[0], bosg.toBuffer()),
            resource.writeVersion(time, this.to()[1], bosg.toBinaryBag().toBuffer()),
        ]);
    }
    from() {
        return [VersionType.TOKENS];
    }
    to() {
        return [VersionType.BAG_OF_SKIP_GRAMS, VersionType.BINARY_BAG_OF_SKIP_GRAMS];
    }

    static Reduced() {
        return class ReducedExtractBOSG extends ExtractBOSG {
            from() {
                return [VersionType.REDUCED_TOKENS]
            }
            to() {
                return [VersionType.REDUCED_BAG_OF_SKIP_GRAMS, VersionType.REDUCED_BINARY_BAG_OF_SKIP_GRAMS];
            }
        }
    }
}
