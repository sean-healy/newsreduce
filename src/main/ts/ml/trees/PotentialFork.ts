import { TrainingData } from "./TrainingData";
import { ForkType } from "./ForkType";

export interface PotentialFork<K, D = any> {
    conditionalData: D;
    branches: TrainingData<K>[],
    type: ForkType;
}