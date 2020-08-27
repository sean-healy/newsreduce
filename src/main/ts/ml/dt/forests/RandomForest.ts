import { DecisionForest } from "./DecisionForest";
import { RandomForestTree } from "../trees/RandomForestTree";
import { ForestTrainingArgs } from "../args/ForestTrainingArgs";
import { DecisionTree } from "../trees/DecisionTree";
import { fancyLog } from "utils/alpha";
import { TrainingData } from "../TrainingData";

export class RandomForest<K> extends DecisionForest<K> {
    /**
     * @param data     the rows of data used to train the random forest.
     * @param args a map of features to the values those features may take,
     *                 along with a list of valid categories.
     */
    train(args: ForestTrainingArgs<K>) {
        const { data, trees: n } = args;
        const trees = new Array<DecisionTree<K>>(n);
        let randomForest = new RandomForest({
            trees,
        });
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
            this.printProgress(args.testData, randomForest);
        }
        console.log(trees);

        return randomForest;
    }
}