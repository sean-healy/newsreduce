import { Predictor, QueryCase } from "./Predictor";
import { ResourceURL } from "types/db-objects/ResourceURL";
import { Predicate } from "types/db-objects/Predicate";
import { AdaBoost } from "ml/classifiers/dt/forests/AdaBoost";
import { ResourceFuzzyPredicate } from "types/db-objects/ResourceFuzzyPredicate";
import { ResourceFeatureBuilder } from "ml/classifiers/features/ResourceFeatureBuilder";
import { selectWikiURLs } from "data";

export class PredictNewsSourceWiki extends Predictor<bigint, ResourceURL> {
    frequency(): number {
        // Every 4 hours.
        return 1000 * 4 * 60 * 60;
    }
    getPredicate() {
        return Predicate.RES_IS_NEWS_SOURCE_WIKI;
    }
    emptyClassifier() {
        return new AdaBoost<bigint>();
    }
    async getItemsToClassify() {
        const urls = await selectWikiURLs();
        const featureBuilder = new ResourceFeatureBuilder();
        const items = new Array<QueryCase<bigint, ResourceURL>>(urls.length);
        for (const url of urls) {
            const resource = new ResourceURL(url);
            items.push([resource, await featureBuilder.build(resource)]);
        }

        return items;
    }
    getFuzzyLabel(resource: ResourceURL, p: number) {
        const predicate = this.getPredicate();
        return new ResourceFuzzyPredicate({ resource, predicate, p });
    }

}