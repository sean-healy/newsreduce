import { Feature } from "./Feature";
import { FeatureType } from "./FeatureType";
import { ForkType } from "./ForkType";
import { ScoredPotentialFork } from "./ScoredPotentialFork";
import { WeightedTrainingData } from "./WeightedTrainingData";
import { WeightedTrainingDataPoint } from "./WeightedTrainingDataPoint";

export class Scalar<K> extends Feature<K, number, Scalar<K>> {
    readonly min: number;
    readonly max: number;
    readonly mean: number;

    type() {
        return FeatureType.SCALAR;
    }

    static giniSum(categoryWeights: IterableIterator<number>) {
        let sum = 0;
        for (const weight of categoryWeights)
            sum += weight ** 2;

        return sum;
    }

    bestWeightedSplit(data: WeightedTrainingData<K>) {
        const { key } = this;
        const sortedData: WeightedTrainingDataPoint<K>[] = [];
        const left = new Map<number, number>();
        const right = new Map<number, number>();
        for (const row of data) {
            const [features, c, weight] = row;
            right.set(c, (right.get(c) || 0) + weight);
            sortedData.push(row);
        }
        sortedData.sort(([a], [b]) => (a.get(key) || 0) - (b.get(key) || 0));
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
            let dataPoint = sortedData[i];
            let [features, category, weight] = dataPoint;
            const previous = features.get(key) || 0;
            do {
                const leftCategoryWeight = left.get(category) || 0;
                const rightCategoryWeight = right.get(category);
                rightSum = rightSum - rightCategoryWeight ** 2 + (rightCategoryWeight - weight) ** 2;
                leftSum = leftSum - leftCategoryWeight ** 2 + (leftCategoryWeight + weight) ** 2;
                left.set(category, leftCategoryWeight + weight);
                right.set(category, rightCategoryWeight - weight);
                rightTotal -= weight;
                ++i;
                if (i >= sortedData.length) break;
                [features, category] = sortedData[i];
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
        //console.log(this.key, splitIndex, labelledData.length);
        if (splitIndex < 1 || splitIndex >= sortedData.length)
            potentialFork = null
        else {
            const maxLeft = sortedData[splitIndex - 1][0].get(key) || 0;
            const minRight = sortedData[splitIndex][0].get(key) || 0;
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
}