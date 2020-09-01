import { Predicate } from "types/db-objects/Predicate";
import { VersionType } from "types/db-objects/VersionType";
import { selectSubDocTrainingData } from "data";
import { LabelledSubDocs, SubDocs } from "ml/SubDocs";
import { fancyLog } from "utils/alpha";
import { AdaBoost } from "ml/classifiers/dt/forests/AdaBoost";
import { TrainingData } from "ml/TrainingData";
import { Trainer } from "./Trainer";
import { ForestTrainingArgs } from "ml/classifiers/dt/args/ForestTrainingArgs";
import { CSVWriter } from "analytics/CSVWriter";

type F = string;
export class ExtractOfficialHomepageModel extends Trainer<F, ForestTrainingArgs<F>> {
    csvWriter() {
        return new CSVWriter(
            "/var/newsreduce/graphs/official-homepage-task-depth-3.csv",
            "N", "DataSet", "FN", "FP", "TN", "TP"
        );
    }
    emptyClassifier() {
        return new AdaBoost<F>();
    }
    decorateClassifierParams(params: ForestTrainingArgs<string>) {
        params.depth = 3;
        params.trees = 50;
    }
    frequency(): number {
        // Every 4 hours.
        return 1000 * 60 * 60 * 4;
    }
    async fetchTrainingAndTestData() {
        fancyLog(`Training for predicate: ${this.getPredicate().functor}.`);
        const subDocsTrainingData = await selectSubDocTrainingData();
        const predicateData = subDocsTrainingData[this.getPredicate().functor];
        const resourceData = new Array<TrainingData<F>>()
        for (const { resource, attribute, pattern } of predicateData) {
            const classifiedSubDocs: LabelledSubDocs = [];
            const subDocs = SubDocs.parseSubDocs(await resource.readLatest(VersionType.SUB_DOCS));
            for (const [subDoc, tokens] of subDocs) {
                classifiedSubDocs.push([
                    subDoc,
                    tokens,
                    (attribute in subDoc && subDoc[attribute].match(pattern)) ? 1 : 0
                ]);
            }
            resourceData.push(SubDocs.resourceSubDocsToTrainingData(classifiedSubDocs, resource));
        }
        const data = TrainingData.concat<F>(...resourceData);

        return data;
    }
    trainingDataRatio() {
        return 0.7
    }
    getPredicate() {
        return Predicate.SUB_DOC_IS_NEWS_SOURCE_HOMEPAGE;
    }
}