import { FeatureType } from "./FeatureType"
import { GenericConstructor } from "types/GenericConstructor";
import { TrainingData } from "./TrainingData";
import { PotentialFork } from "./PotentialFork";

export abstract class Feature<K, V, D = any, F extends Feature<K, V, D, F> = Feature<K, V, any, any>>
extends GenericConstructor<F> {
    readonly key: K;

    abstract type(): FeatureType;

    abstract bestSplit<C>(data: TrainingData<K, V, C>): PotentialFork<K, V, C, D>;
}