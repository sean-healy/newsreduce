import { FeatureBuilder } from "./FeatureBuilder";
import { ResourceURL } from "types/db-objects/ResourceURL";
import { VersionType } from "types/db-objects/VersionType";
import { WordVector } from "types/db-objects/WordVector";
import { Word } from "types/db-objects/Word";
import { fancyLog } from "utils/alpha";

export class ResourceFeatureBuilder extends FeatureBuilder<ResourceURL, bigint | string> {
    async build(resource: ResourceURL) {
        //const tokens = await resource.readLatest(VersionType.TOKENS);
        const linksBuffer = await resource.readLatest(VersionType.RAW_LINKS_TXT);
        const vecBuffer = await resource.readLatest(VersionType.NORMALISED_DOCUMENT_VECTOR);
        const features = new Map<bigint | string, number>();
        if (vecBuffer) {
            const vector = WordVector.bufferToVector(vecBuffer);
            for (let i = 0; i < vector.length; ++i) {
                features.set(`vector-dimension:${i}`, vector[i]);
            }
        }
        /*
        if (tokens) {
            const words = tokens.toString().split(/\s+/g);
            for (let i = 0; i < words.length; ++i) {
                const position = 1 - i / words.length;
                const wordID = new Word(words[i]).getID();
                if (!features.has(wordID))
                    features.set(wordID, position);
            }
        }
        */
        if (linksBuffer) {
            const links = linksBuffer.toString().split("\n").map(l => l.split("#", 1)[0]);
            for (let i = 0; i < links.length; ++i) {
                const link = links[i];
                let url: ResourceURL;
                try {
                    url = new ResourceURL(link);
                } catch (e) {
                    fancyLog(`URL issue: ${JSON.stringify(e)}.`);
                }
                const position = 1 - i / links.length;
                const urlID = url.getID();
                if (!features.has(urlID))
                    features.set(urlID, position);
            }
        }

        return features;
    }
}