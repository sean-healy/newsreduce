import { Feature } from "./Feature";
import { FeatureType } from "./FeatureType";
import { ForkType } from "../forks/ForkType";
import { TrainingData } from "../TrainingData";
import { ScoredPotentialFork } from "../ScoredPotentialFork";
import { Fork } from "../forks/Fork";
import { Leaf } from "../forks/Leaf";
import { CategoricalFork } from "../forks/CategoricalFork";

export class Categorical<K> extends Feature<K, number[], Categorical<K>> {
    readonly values: Set<number>;

    type() {
        return FeatureType.CATEGORICAL;
    }

    bestSplit(data: TrainingData<K>) {
        const left = TrainingData.initWithLength<K>(0);
        const right = TrainingData.initWithLength<K>(0);
        const indexedSides = [left, right] as [TrainingData<K>, TrainingData<K>];
        const weights = [[0, 0], [0, 0]] as [[number, number], [number, number]];
        for (let i = 0; i < data.length; ++i) {
            const features = data.features[i];
            const value = features.get(this.key) || 0;
            { // non-final split.
                const side = indexedSides[value];
                side.features.push(features);
                side.weights.push(data.weights[i]);
                side.labels.push(data.labels[i]);
                side.length += 1;
            }
            weights[value][data.labels[i]] += data.weights[i];
        }

        let potentialFork: ScoredPotentialFork<K>;
        if (left.length * right.length !== 0)
            potentialFork = {
                branches: indexedSides,
                type: ForkType.CATEGORICAL,
                score: Feature.leftRightGiniImpurity(weights),
            };
        else potentialFork = null;

        return potentialFork;
    }

    bestFinalSplit(data: TrainingData<K>) {
        const weights = [[0, 0], [0, 0]] as [[number, number], [number, number]];
        const [left, right] = weights;
        for (let i = 0; i < data.length; ++i) {
            const features = data.features[i];
            const value = features.get(this.key) || 0;
            weights[value][data.labels[i]] += data.weights[i];
        }

        const leftLabel = weights[0][0] > weights[0][1] ? 0 : 1;
        const rightLabel = weights[1][0] > weights[1][1] ? 0 : 1;

        let fork: Fork;
        if (leftLabel === rightLabel) {
            return null;
        } else {
            fork = new CategoricalFork({
                branches: [
                    new Leaf({ label: leftLabel }),
                    new Leaf({ label: rightLabel }),
                ],
                feature: this.key,
            });
        }

        const total = left[0] + left[1] + right[0] + right[1];
        // We use error rate instead of gini impurity for child nodes.
        const score = (left[1 ^ leftLabel] + right[1 ^ rightLabel]) / total;
        return {
            type: ForkType.FINAL,
            conditionalData: fork,
            score,
        } as ScoredPotentialFork<K, Fork>;
    }
}