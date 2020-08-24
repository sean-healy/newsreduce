import { ResourceURL } from "types/db-objects/ResourceURL";
import { VersionType } from "types/db-objects/VersionType";
import { ResourceProcessor } from "./ResourceProcessor";
import { Dictionary } from "utils/alpha";
import { getSkipGrams } from "./ExtractBOSG";
import { InputCache } from "./functions";

export class ExtractBOTG extends ResourceProcessor {
    async apply(resource: ResourceURL, input: Dictionary<InputCache>, time?: number) {
        const cache = input[this.from()[0].filename];
        const botg = getSkipGrams(cache, 3, 0);
        await Promise.all([
            resource.writeVersion(time, this.to()[0], botg.toBuffer()),
            resource.writeVersion(time, this.to()[1], botg.toBinaryBag().toBuffer()),
        ]);
    }
    from() {
        return [VersionType.TOKENS];
    }
    to() {
        return [VersionType.BAG_OF_TRIGRAMS, VersionType.BINARY_BAG_OF_TRIGRAMS];
    }

    static Reduced() {
        return class ReducedExtractBOTG extends ExtractBOTG {
            from() {
                return [VersionType.REDUCED_TOKENS]
            }
            to() {
                return [VersionType.REDUCED_BAG_OF_TRIGRAMS, VersionType.REDUCED_BINARY_BAG_OF_TRIGRAMS];
            }
        }
    }
}
