import { DecisionForest } from "./DecisionForest";
import { ForestMetaData } from "./ForestMetaData";
import { DecisionTree } from "./DecisionTree";
import { WeightedTrainingData } from "./WeightedTrainingData";

export class NonForest<K> extends DecisionForest<K> {
    train(data: WeightedTrainingData<K>, metaData: ForestMetaData<K>) {
        const trees = [new DecisionTree<K>().train(data, metaData)];
        return new NonForest<K>({ trees: trees });
    }
}