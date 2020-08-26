import { TreeMetaData } from "./TreeMetaData";

export interface ForestMetaData<K> extends TreeMetaData<K> {
    trees: number;
}