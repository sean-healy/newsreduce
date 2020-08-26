import { Feature } from "./Feature";

export interface TreeMetaData<K> {
    features?: Feature<K, number | boolean>[];
    categories?: number[];
    depth?: number;
}