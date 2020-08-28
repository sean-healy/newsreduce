import { Predicate } from "types/db-objects/Predicate";
import { VersionType } from "types/db-objects/VersionType";
import { selectDocTrainingData } from "data";
import { LabelledSubDocs } from "ml/SubDocs";
import { fancyLog } from "utils/alpha";
import { AdaBoost } from "ml/classifiers/dt/forests/AdaBoost";
import { TrainingData } from "ml/TrainingData";
import { Trainer } from "./Trainer";
import { ForestTrainingArgs } from "ml/classifiers/dt/args/ForestTrainingArgs";
import { BinaryBag } from "ml/bags/BinaryBag";
import { Word } from "types/db-objects/Word";
import { ResourceURL } from "types/db-objects/ResourceURL";
import { ResourceFeatureBuilder } from "ml/classifiers/features/ResourceFeatureBuilder";

export class ExtractNewsSourceWikiModel extends Trainer<bigint, ForestTrainingArgs<bigint>> {
    emptyClassifier() {
        return new AdaBoost<bigint>();
    }
    decorateClassifierParams(params: ForestTrainingArgs<bigint>) {
        params.depth = 1;
        params.trees = 200;
    }
    frequency(): number {
        // Every 4 hours.
        return 1000 * 60 * 60 * 4;
    }
    async fetchTrainingAndTestData() {
        fancyLog(`Training for predicate: ${this.getPredicate().functor}.`);
        const subDocsTrainingData = await selectDocTrainingData();
        const predicateData = subDocsTrainingData[this.getPredicate().functor];
        const data = TrainingData.initWithLength<bigint>(predicateData.length);
        const featureBuilder = new ResourceFeatureBuilder();
        for (let i = 0; i < predicateData.length; ++i) {
            const { resource, polarity } = predicateData[i];
            const features = await featureBuilder.build(resource);
            data.features[i] = features;
            data.labels[i] = polarity ? 1 : 0;
            data.weights[i] = 1 / predicateData.length;
        }

        return data;
    }
    trainingDataRatio() {
        return 0.7
    }
    getPredicate() {
        return Predicate.RES_IS_NEWS_SOURCE_WIKI;
    }
}