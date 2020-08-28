import { FeatureBuilder } from "./FeatureBuilder";
import { ResourceURL } from "types/db-objects/ResourceURL";
import { BinaryBag } from "ml/bags/BinaryBag";
import { Word } from "types/db-objects/Word";
import { VersionType } from "types/db-objects/VersionType";

export class ResourceFeatureBuilder extends FeatureBuilder<ResourceURL, bigint> {
    async build(resource: ResourceURL) {
        const bbowBuffer = await resource.readLatest(VersionType.REDUCED_BINARY_BAG_OF_WORDS);
        const linksBuffer = await resource.readLatest(VersionType.BINARY_BAG_OF_LINKS);
        const bbow = new BinaryBag(word => new Word(word)).fromBuffer(bbowBuffer);
        const links = new BinaryBag(url => new ResourceURL(url)).fromBuffer(linksBuffer);
        const features = new Map<bigint, number>();
        for (const wordID of bbow.bag) {
            features.set(wordID, 1);
        }
        for (const urlID of links.bag) {
            features.set(urlID, 1);
        }

        return features;
    }
}