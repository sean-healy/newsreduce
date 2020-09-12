import { Predicate } from "types/db-objects/Predicate";
import { selectDocTrainingData } from "data";
import { fancyLog } from "utils/alpha";
import { AdaBoost } from "ml/classifiers/dt/forests/AdaBoost";
import { TrainingData } from "ml/TrainingData";
import { Trainer } from "./Trainer";
import { ForestTrainingArgs } from "ml/classifiers/dt/args/ForestTrainingArgs";
import { ResourceFeatureBuilder } from "ml/classifiers/features/ResourceFeatureBuilder";
import { CSVWriter } from "analytics/CSVWriter";
import { VersionType } from "types/db-objects/VersionType";

const EXPERIMENTAL_FEATURE_VERSION_TYPE = VersionType.DOCUMENT_FEATURES_00;

export class ExtractNewsSourceWikiModel extends Trainer<bigint | string, ForestTrainingArgs<bigint>> {
    trees(): number {
        return 500;
    }
    depth(): number {
        return 3;
    }
    csvWriter() {
        return new CSVWriter(
            "/var/newsreduce/graphs/news-source-wiki-task-vectors-links-only.csv",
            "N", "DataSet", "FN", "FP", "TN", "TP"
        );
    }
    emptyClassifier() {
        return new AdaBoost<bigint | string>();
    }
    decorateClassifierParams(params: ForestTrainingArgs<bigint>) {
        params.depth = 1;
        params.trees = 75;
    }
    frequency(): number {
        // Every 4 hours.
        return 1000 * 60 * 60 * 4;
    }
    async fetchTrainingAndTestData() {
        const predicate = this.getPredicate();
        const buffer = await predicate.readLatest(EXPERIMENTAL_FEATURE_VERSION_TYPE);
        let data: TrainingData<string | bigint>;
        if (!buffer) {
            fancyLog(`Training for predicate: ${predicate.functor}.`);
            const docsTrainingData = await selectDocTrainingData();
            const predicateData = docsTrainingData[predicate.functor];
            //const predicateData = docsTrainingData[this.getPredicate().functor].slice(0, 990);
            data = TrainingData.initWithLength<bigint | string>(predicateData.length);
            const featureBuilder = new ResourceFeatureBuilder();
            const length = predicateData.length;
            for (let i = 0; i < length; ++i) {
                const { resource, polarity } = predicateData[i];
                process.stdout.write(`\r                   \r${i} / ${length}`);
                const features = await featureBuilder.build(resource);
                data.features[i] = features;
                data.labels[i] = polarity ? 1 : 0;
                data.weights[i] = 1 / predicateData.length;
            }
            const dataJSON = {
                labels: data.labels,
                weights: data.weights,
                length: data.length,
                features: data
                    .features
                    .map(features => [...features.entries()]
                    .map(([k, v]) => [`${k}`, v])),
            };
            fancyLog(`Writing features to disk.`)
            await predicate.writeVersion(Date.now(),
                EXPERIMENTAL_FEATURE_VERSION_TYPE, JSON.stringify(dataJSON));
            fancyLog(`Written.`)
        } else {
            fancyLog(`Loading features from disk (pre-processed).`)
            const dataJSON = JSON.parse(buffer.toString());
            const mapFeatures: Map<bigint | string, number>[] = [];
            for (const features of dataJSON.features) {
                mapFeatures.push(new Map(
                    features.map(([key, value]) =>
                        [key.match(/^[0-9]+$/) ? BigInt(key) : key, value])
                ));
            }
            data = new TrainingData({
                ...dataJSON,
                features: mapFeatures,
            });
            fancyLog(`Loaded.`)
        }
        console.log();

        return data;
    }
    trainingDataRatio() {
        return 0.6;
    }
    getPredicate() {
        return Predicate.RES_IS_NEWS_SOURCE_WIKI;
    }
}