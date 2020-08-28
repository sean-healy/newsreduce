import { ForkType } from "./forks/ForkType";
import { TrainingData } from "../../TrainingData";

export interface ScoredPotentialFork<K, D = any> {
    score: number;
    conditionalData?: D;
    branches?: TrainingData<K>[],
    type: ForkType;
}