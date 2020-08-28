import { Feature } from "../../features/Feature";
import { TrainingData } from "../../../TrainingData";
import { ClassifierTrainingArgs } from "ml/classifiers/args/ClassifierTrainingArgs";

export interface TreeTrainingArgs<K> extends ClassifierTrainingArgs<K> {
    data: TrainingData<K>;
    testData: TrainingData<K>;
    features?: Feature<K>[];
    depth?: number;
}