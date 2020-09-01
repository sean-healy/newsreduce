import { Ensemble } from "ml/classifiers/Ensemble";
import { RandomForestTree } from "../trees/RandomForestTree";
import { ForestTrainingArgs } from "../args/ForestTrainingArgs";
import { fancyLog } from "utils/alpha";
import { VersionType } from "types/db-objects/VersionType";
import { TrainingData } from "ml/TrainingData";
import { DecisionTree } from "ml/classifiers/dt/trees/DecisionTree";
import { CSVWriter } from "analytics/CSVWriter";

export class RandomForest<K> extends Ensemble<K, ForestTrainingArgs<K>, RandomForest<K>> {
    fsVersionType() {
        return VersionType.RANDOM_FOREST;
    }
    /**
     * @param data     the rows of data used to train the random forest.
     * @param args a map of features to the values those features may take,
     *                 along with a list of valid categories.
     */
    train(args: ForestTrainingArgs<K>, csvWriter: CSVWriter) {
        const { data, trees: n } = args;
        const trees = new Array<DecisionTree<K>>(n);
        const weights = new Array<number>(args.trees);
        for (let i = 0; i < args.trees; ++i) weights[i] = 1;
        let randomForest = new RandomForest({ classifiers: trees, weights });
        for (let i = 0; i < n; ++i) {
            fancyLog(`Training tree #${i + 1}.`);
            const sampleWithReplacement = TrainingData.initWithLength<K>(data.length);
            for (let j = 0; j < data.length; ++j) {
                const index = Math.floor(Math.random() * data.length)
                sampleWithReplacement.features[j] = data.features[index];
                sampleWithReplacement.weights[j] = data.weights[index];
                sampleWithReplacement.labels[j] = data.labels[index];
            }
            trees[i] = new RandomForestTree<K>().train({
                ...args,
                data: sampleWithReplacement,
            });
            randomForest.threshold = 0.5;
            while (true) {
                const { precision, recall } = this.precisionAndRecall(args, randomForest);
                if (precision <= 0.9) break;
                else randomForest.threshold -= 0.005;
            }
            this.printProgress(args, randomForest, i + 1, csvWriter);
        }

        return randomForest;
    }
}