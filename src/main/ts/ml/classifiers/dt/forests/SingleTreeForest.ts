import { Ensemble } from "ml/classifiers/Ensemble";
import { ForestTrainingArgs } from "../args/ForestTrainingArgs";
import { DecisionTree } from "../trees/DecisionTree";
import { VersionType } from "types/db-objects/VersionType";

export class SingleTreeForest<K> extends Ensemble<K, ForestTrainingArgs<K>, SingleTreeForest<K>> {
    fsVersionType() {
        return VersionType.SINGLE_TREE_FOREST;
    }
    train(args: ForestTrainingArgs<K>) {
        const trees = [new DecisionTree<K>().train(args)];
        return new SingleTreeForest<K>({ classifiers: trees });
    }
}