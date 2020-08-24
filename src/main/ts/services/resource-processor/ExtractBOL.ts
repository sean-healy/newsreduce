import fs from "fs"
import { ResourceURL } from "types/db-objects/ResourceURL";
import { VersionType } from "types/db-objects/VersionType";
import { BagOfURLs } from "ml/bags/BagOfURLs";
import { ResourceProcessor } from "./ResourceProcessor";
import { Dictionary, fancyLog } from "utils/alpha";
import { InputCache } from "./functions";

const HASH = "#";

export class ExtractBOL extends ResourceProcessor {
    async apply(resource: ResourceURL, input: Dictionary<InputCache>, time?: number) {
        const cache = input[this.from()[0].filename];
        const urls = cache
            .buffer
            .toString()
            .split("\n")
            .map(url => url.split("#", 1)[0]);
        const bag = new BagOfURLs();
        for (const url of urls) {
            try {
            bag.register(url);
            } catch (e) {
                fancyLog("error while parsing URL:");
                fancyLog(url);
                fancyLog(JSON.stringify(e));
                fs.appendFileSync("/tmp/errors", `<<<${url}>>>`);
            }
        }
        await Promise.all([
            resource.writeVersion(time, this.to()[0], bag.toBuffer()),
            resource.writeVersion(time, this.to()[1], bag.toBinaryBag().toBuffer()),
        ]);
    }
    from() {
        return [VersionType.RAW_LINKS_TXT];
    }
    to() {
        return [VersionType.BAG_OF_LINKS, VersionType.BINARY_BAG_OF_LINKS];
    }
}
