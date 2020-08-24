import { Feature } from "./Feature";
import { FeatureType } from "./FeatureType";
import { TrainingData } from "./TrainingData";
import { ForkType } from "./ForkType";
import { PotentialFork } from "./PotentialFork";

export class Categorical<K, V> extends Feature<K, V, V[], Categorical<K, V>> {
    readonly values: Set<V>;

    type() {
        return FeatureType.CATEGORICAL;
    }

    bestSplit<C>(data: TrainingData<K, V, C>) {
        const splitData = new Map<V, TrainingData<K, V, C>>();
        for (const row of data) {
            const [features, ] = row;
            const value = (features.get(this.key) || false) as V;
            let split = splitData.get(value);
            if (!split) {
                split = [];
                splitData.set(value, split);
            }
            split.push(row);
        }
        const conditionalData = [...splitData.keys()];
        const branches = [...splitData.values()];

        let potentialFork: PotentialFork<K, V, C, V[]>;
        if (branches.length > 1)
            potentialFork = {
                conditionalData,
                branches,
                type: ForkType.CATEGORICAL,
            };
        else potentialFork = null;

        return potentialFork;
    }
}