import { Feature } from "./Feature";
import { FeatureType } from "./FeatureType";
import { ForkType } from "../forks/ForkType";
import { ScoredPotentialFork } from "../ScoredPotentialFork";
import { TrainingData } from "../TrainingData";
import { Fork } from "../forks/Fork";
import { Leaf } from "../forks/Leaf";
import { ScalarFork } from "../forks/ScalarFork";

export class Scalar<K> extends Feature<K, number, Scalar<K>> {
    readonly min: number;
    readonly max: number;
    readonly mean: number;

    type() {
        return FeatureType.SCALAR;
    }

    static giniSum(categoryWeights: IterableIterator<number> | number[]) {
        let sum = 0;
        for (const weight of categoryWeights)
            sum += weight ** 2;

        return sum;
    }

    bestSplit(data: TrainingData<K>) {
        const { key } = this;
        const left = [0, 0];
        const right = [0, 0];

        for (let i = 0; i < data.length; ++i) {
            const weight = data.weights[i];
            const label = data.labels[i];
            right[label] += weight;
        }
        const sortedData = data.sortByFeature(key);
        let total = 0;
        for (const weight of right.values()) total += weight;
        let rightTotal = total;
        let leftSum = Scalar.giniSum(left.values());
        let rightSum = Scalar.giniSum(right.values());
        let splitIndex = 0;
        let maxGiniPurity = rightSum / rightTotal ** 2;
        let i = 0;
        while (i < sortedData.length) {
            let next: number;
            let { features, label, weight } = sortedData.get(i);
            const previous = features.get(key) || 0;
            do {
                const leftCategoryWeight = left[label];
                const rightCategoryWeight = right[label];
                rightSum = rightSum - rightCategoryWeight ** 2 + (rightCategoryWeight - weight) ** 2;
                leftSum = leftSum - leftCategoryWeight ** 2 + (leftCategoryWeight + weight) ** 2;
                left[label] = leftCategoryWeight + weight;
                right[label] = rightCategoryWeight - weight;
                rightTotal -= weight;
                ++i;
                if (i >= sortedData.length) break;
                features = sortedData.features[i];
                label = sortedData.labels[i];
                weight = sortedData.weights[i];
                next = features.get(key) || 0;
            } while (next === previous);
            const leftTotal = total - rightTotal;
            const leftPurity = leftTotal ? leftSum / (leftTotal * total) : 0;
            const rightPurity = rightTotal ? rightSum / (rightTotal * total) : 0;
            const giniPurity = leftPurity + rightPurity
            if (giniPurity >= maxGiniPurity) {
                splitIndex = i;
                maxGiniPurity = giniPurity;
            }
        }
        let potentialFork: ScoredPotentialFork<K, number>;
        if (splitIndex < 1 || splitIndex >= sortedData.length)
            potentialFork = null
        else {
            const maxLeft = sortedData.features[splitIndex - 1].get(key) || 0;
            const minRight = sortedData.features[splitIndex].get(key) || 0;
            potentialFork = {
                conditionalData: maxLeft + (minRight - maxLeft) / 2,
                branches: [
                    sortedData.slice(0, splitIndex),
                    sortedData.slice(splitIndex),
                ],
                type: ForkType.SCALAR,
                score: 1 - maxGiniPurity,
            }
        }

        return potentialFork;
    }
    bestFinalSplit(data: TrainingData<K>) {
        const { key } = this;
        const left = [0, 0];
        const right = [0, 0];

        for (let i = 0; i < data.length; ++i) {
            const weight = data.weights[i];
            const label = data.labels[i];
            right[label] += weight;
        }
        const sortedData = data.sortByFeature(key);
        let total = 0;
        for (const weight of right.values()) total += weight;
        let splitIndex = 0;
        let i = 0;
        let leftLabel: number,
            rightLabel: number,
            minLeftLabel: number,
            minRightLabel: number;
        let minScore = 1;
        while (i < sortedData.length) {
            let next: number;
            let { features, label, weight } = sortedData.get(i);
            const previous = features.get(key) || 0;
            do {
                const leftCategoryWeight = left[label];
                const rightCategoryWeight = right[label];
                left[label] = leftCategoryWeight + weight;
                right[label] = rightCategoryWeight - weight;
                ++i;
                if (i >= sortedData.length) break;
                features = sortedData.features[i];
                label = sortedData.labels[i];
                weight = sortedData.weights[i];
                next = features.get(key) || 0;
            } while (next === previous);
            leftLabel = left[0] > left[1] ? 0 : 1;
            rightLabel = right[0] > right[1] ? 0 : 1;
            // Use error instead of gini impurity when building DT stumps.
            const score = (left[1 ^ leftLabel] + right[1 ^ rightLabel]) / total;
            if (leftLabel !== rightLabel && score < minScore) {
                splitIndex = i;
                minScore = score;
                minLeftLabel = leftLabel;
                minRightLabel = rightLabel;
            }
        }

        let fork: Fork;
        if (splitIndex < 1 || splitIndex >= sortedData.length) {
            return null
        } else if (minScore === 1) {
            // No pivots found (data is predominently one label).
            minScore = (left[1 ^ leftLabel] + right[1 ^ rightLabel]) / total;
            fork = new Leaf({ label: leftLabel });
        } else {
            const leftFeatures = sortedData.features[splitIndex - 1]
            const rightFeatures = sortedData.features[splitIndex]
            const maxLeft = leftFeatures.get(key) || 0;
            const minRight = rightFeatures.get(key) || 0;
            const pivot = maxLeft + (minRight - maxLeft) / 2;
            fork = new ScalarFork({
                left: new Leaf({ label: minLeftLabel }),
                right: new Leaf({ label: minRightLabel }),
                pivot,
                feature: this.key,
            });
        }

        return {
            type: ForkType.FINAL,
            conditionalData: fork,
            score: minScore,
        } as ScoredPotentialFork<K, Fork>;
    }
}