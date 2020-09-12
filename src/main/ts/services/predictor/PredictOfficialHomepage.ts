import { Predictor, QueryCase } from "./Predictor";
import { ResourceURL } from "types/db-objects/ResourceURL";
import { Predicate } from "types/db-objects/Predicate";
import { AdaBoost } from "ml/classifiers/dt/forests/AdaBoost";
import { selectProbableNewsSourceWikis } from "data";
import { SubDocs } from "ml/SubDocs";
import { VersionType } from "types/db-objects/VersionType";
import { ResourceFuzzyLabel } from "types/db-objects/ResourceFuzzyLabel";
import { fancyLog } from "utils/alpha";
import { Label } from "types/db-objects/Label";

export class PredictOfficialHomepage extends Predictor<bigint | string, ResourceFuzzyLabel> {
    frequency(): number {
        // Every 4 hours.
        return 1000 * 4 * 60 * 60;
    }
    getPredicate() {
        return Predicate.SUB_DOC_IS_NEWS_SOURCE_HOMEPAGE;
    }
    emptyClassifier() {
        return new AdaBoost<bigint>();
    }
    async *getItemsToClassify() {
        const urls = await selectProbableNewsSourceWikis();
        let i = 0;
        const predicate = this.getPredicate();
        for (const url of urls) {
            const resource = new ResourceURL(url);
            const subDocs = SubDocs.parseSubDocs(await resource.readLatest(VersionType.SUB_DOCS));
            const features = SubDocs.resourceSubDocsToPredictionFeatures(subDocs, resource);
            for (let i = 0; i < features.length; ++i) {
                const subDoc = subDocs[i];
                const href = subDoc[0].href;
                if ("href" in subDoc[0]) {
                    let officialHomepageResource: ResourceURL;
                    try {
                        officialHomepageResource = new ResourceURL(href);
                        const fuzzyLabel = new ResourceFuzzyLabel({
                            resource,
                            predicate,
                            label: new Label(officialHomepageResource.toURL()),
                        });
                        yield([fuzzyLabel, features[i]] as QueryCase<string, ResourceFuzzyLabel>);
                    } catch (e) {
                        //fancyLog(`Error caught while parsing url: ${href}`);
                    }
                }
            }
        }

        return;
    }
    getFuzzyLabel(result: ResourceFuzzyLabel, p: number) {
        result.p = p;

        return result;
    }
}