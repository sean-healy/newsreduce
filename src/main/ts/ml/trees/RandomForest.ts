import { DecisionForest } from "./DecisionForest";
import { TrainingData } from "./TrainingData";
import { RandomForestTree } from "./RandomForestTree";
import { ForestMetaData } from "./ForestMetaData";
import { DecisionTree } from "./DecisionTree";
import { fancyLog } from "utils/alpha";

export class RandomForest<K, V, C> extends DecisionForest<K, V, C> {
    /**
     * @param data     the rows of data used to train the random forest.
     * @param metaData a map of features to the values those features may take,
     *                 along with a list of valid categories.
     */
    train(data: TrainingData<K, V, C>, metaData: ForestMetaData<K, V, C>) {
        const trees = new Array<DecisionTree<K, V, C>>(metaData.trees);
        for (let i = 0; i < metaData.trees; ++i) {
            fancyLog(`Training tree #${i + 1}.`);
            const sampleWithReplacement: TrainingData<K, V, C> = new Array(data.length);
            for (let j = 0; j < data.length; ++j)
                sampleWithReplacement[j] = data[Math.floor(Math.random() * data.length)];
            trees[i] = new RandomForestTree<K, V, C>().train(sampleWithReplacement, metaData);
        }
        console.log(trees);

        return new RandomForest<K, V, C>({ trees });
    }
}