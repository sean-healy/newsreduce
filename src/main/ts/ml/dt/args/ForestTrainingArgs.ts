import { TreeTrainingArgs } from "./TreeTrainingArgs";

export interface ForestTrainingArgs<K> extends TreeTrainingArgs<K> {
    trees: number;
}