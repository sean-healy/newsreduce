import { DecisionForest } from "./DecisionForest";
import { TrainingData } from "./TrainingData";
import { ForestMetaData } from "./ForestMetaData";
import { DecisionTree } from "./DecisionTree";

export class NonForest<K, V, C> extends DecisionForest<K, V, C> {
    train(data: TrainingData<K, V, C>, metaData: ForestMetaData<K, V, C>) {
        const trees = [new DecisionTree<K, V, C>().train(data, metaData)];
        return new NonForest<K, V, C>({ trees });
    }
}