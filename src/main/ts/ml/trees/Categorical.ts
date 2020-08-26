import { Feature } from "./Feature";
import { FeatureType } from "./FeatureType";
import { TrainingData } from "./TrainingData";
import { ForkType } from "./ForkType";
import { PotentialFork } from "./PotentialFork";
import { WeightedTrainingData } from "./WeightedTrainingData";
import { ScoredPotentialFork } from "./ScoredPotentialFork";

export class Categorical<K> extends Feature<K, number[], Categorical<K>> {
    readonly values: Set<number>;

    type() {
        return FeatureType.CATEGORICAL;
    }

    bestWeightedSplit(data: WeightedTrainingData<K>) {
        const branches = [[], []] as [WeightedTrainingData<K>, WeightedTrainingData<K>];
        for (const row of data) {
            const [features, ] = row;
            const value = features.get(this.key) || 0;
            branches[value].push(row);
        }

        let potentialFork: ScoredPotentialFork<K>;
        if (branches.length > 1)
            potentialFork = {
                branches,
                type: ForkType.CATEGORICAL,
                score: Feature.leftRightGiniImpurity(branches),
            };
        else potentialFork = null;

        return potentialFork;
    }
}