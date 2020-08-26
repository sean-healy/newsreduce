import { DecisionForest } from "./DecisionForest";
import { TrainingData } from "./TrainingData";
import { RandomForestTree } from "./RandomForestTree";
import { ForestMetaData } from "./ForestMetaData";
import { DecisionTree } from "./DecisionTree";
import { fancyLog } from "utils/alpha";
import { WeightedTrainingData } from "./WeightedTrainingData";

export class RandomForest<K> extends DecisionForest<K> {
    /**
     * @param data     the rows of data used to train the random forest.
     * @param metaData a map of features to the values those features may take,
     *                 along with a list of valid categories.
     */
    train(data: WeightedTrainingData<K>, metaData: ForestMetaData<K>) {
        const trees = new Array<DecisionTree<K>>(metaData.trees);
        let randomForest = new RandomForest({
            trees,
        });
        for (let i = 0; i < metaData.trees; ++i) {
            fancyLog(`Training tree #${i + 1}.`);
            const sampleWithReplacement: WeightedTrainingData<K> = new Array(data.length);
            for (let j = 0; j < data.length; ++j)
                sampleWithReplacement[j] = data[Math.floor(Math.random() * data.length)];
            trees[i] = new RandomForestTree<K>().train(sampleWithReplacement, metaData);
            let FN = 0;
            let FP = 0;
            let TN = 0;
            let TP = 0;
            for (const [features, actual] of data) {
                const [expected, surety] = randomForest.hardClassify(features);
                if (expected && actual) ++TP;
                if (!expected && !actual) ++TN;
                if (!expected && actual) {
                    ++FN;
                }
                if (expected && !actual) ++FP;
            }
            let a = (TN + TP) / (TN + TP + FN + FP);
            let p = TP / (TP + FP);
            let r = TP / (TP + FN);
            console.log({ FN, FP, TN, TP, a, p, r });
        }
        console.log(trees);

        return randomForest;
    }
}