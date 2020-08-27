import { DecisionForest } from "./DecisionForest";
import { ForestTrainingArgs } from "../args/ForestTrainingArgs";
import { DecisionTree } from "../trees/DecisionTree";

export class SingleTreeForest<K> extends DecisionForest<K> {
    train(args: ForestTrainingArgs<K>) {
        const trees = [new DecisionTree<K>().train(args)];
        return new SingleTreeForest<K>({ trees: trees });
    }
}