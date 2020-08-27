import { Feature } from "../features/Feature";
import { TrainingData } from "../TrainingData";

export interface TreeTrainingArgs<K> {
    data: TrainingData<K>;
    testData: TrainingData<K>;
    features?: Feature<K>[];
    depth?: number;
}