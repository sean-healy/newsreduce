import { TrainingData } from "./TrainingData";
import { ForkType } from "./ForkType";

export interface PotentialFork<K, V, C, D = any> {
    conditionalData: D;
    branches: TrainingData<K, V, C>[];
    type: ForkType;
}