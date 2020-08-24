import { Feature } from "./Feature";

export interface TreeMetaData<K, V, C> {
    features?: Feature<K, V>[];
    categories?: C[];
    depth?: number;
}