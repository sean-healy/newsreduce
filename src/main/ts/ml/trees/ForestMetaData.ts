import { TreeMetaData } from "./TreeMetaData";

export interface ForestMetaData<K, V, C> extends TreeMetaData<K, V, C> {
    trees: number;
}