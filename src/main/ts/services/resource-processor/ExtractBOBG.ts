
import { ResourceURL } from "types/db-objects/ResourceURL";
import { VersionType } from "types/db-objects/VersionType";
import { ResourceProcessor } from "./ResourceProcessor";
import { Dictionary } from "common/util";
import { getSkipGrams } from "./ExtractBOSG";
import { InputCache } from "./functions";

export class ExtractBOBG extends ResourceProcessor {
    async apply(resource: ResourceURL, input: Dictionary<InputCache>, time?: number) {
        const cache = input[this.from()[0].filename];
        const bobg = getSkipGrams(cache, 2, 0);
        await Promise.all([
            resource.writeVersion(time, this.to()[0], bobg.toBuffer()),
            resource.writeVersion(time, this.to()[1], bobg.toBinaryBag().toBuffer()),
        ]);
    }
    from() {
        return [VersionType.TOKENS];
    }
    to() {
        return [VersionType.BAG_OF_BIGRAMS, VersionType.BINARY_BAG_OF_BIGRAMS];
    }

    static Reduced() {
        return class ReducedExtractBOBG extends ExtractBOBG {
            from() {
                return [VersionType.REDUCED_TOKENS]
            }
            to() {
                return [VersionType.REDUCED_BAG_OF_BIGRAMS, VersionType.REDUCED_BINARY_BAG_OF_BIGRAMS];
            }
        }
    }
}
