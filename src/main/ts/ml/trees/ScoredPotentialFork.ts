import { ForkType } from "./ForkType";
import { WeightedTrainingData } from "./WeightedTrainingData";

export interface ScoredPotentialFork<K, D = any> {
    score: number;
    conditionalData?: D;
    branches: WeightedTrainingData<K>[],
    type: ForkType;
}