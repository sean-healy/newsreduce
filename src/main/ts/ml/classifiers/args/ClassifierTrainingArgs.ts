import { Feature } from "ml/classifiers/features/Feature";
import { TrainingData } from "ml/TrainingData";

export interface ClassifierTrainingArgs<K> {
    data: TrainingData<K>;
    testData: TrainingData<K>;
    features?: Feature<K>[];
}