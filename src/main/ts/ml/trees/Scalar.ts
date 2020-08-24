import { Feature } from "./Feature";
import { FeatureType } from "./FeatureType";
import { TrainingData } from "./TrainingData";
import { TrainingDataPoint } from "./TrainingDataPoint";
import { PotentialFork } from "./PotentialFork";
import { ForkType } from "./ForkType";

export class Scalar<K, V> extends Feature<K, V, number, Scalar<K, V>> {
    readonly min: number;
    readonly max: number;
    readonly mean: number;

    type() {
        return FeatureType.SCALAR;
    }

    static giniSum(categoryCounts: IterableIterator<number>) {
        let sum = 0;
        for (const count of categoryCounts)
            sum += count ** 2;

        return sum;
    }
    bestSplit<C>(data: TrainingData<K, V, C>) {
        const { key } = this;
        const labelledData: TrainingDataPoint<K, V, C>[] = [];
        const unlabelledData: TrainingDataPoint<K, V, C>[] = [];
        const left = new Map<C, number>();
        const right = new Map<C, number>();
        for (const row of data) {
            const [features, c] = row;
            right.set(c, (right.get(c) || 0) + 1);
            const value = features.get(key);
            if (value)
                labelledData.push(row);
            else
                unlabelledData.push(row);
        }
        labelledData.sort(([a], [b]) => (a.get(key) as unknown as number) - (b.get(key) as unknown as number));
        let total = 0;
        for (const count of right.values()) total += count;
        let rightTotal = total;
        let leftSum = Scalar.giniSum(left.values());
        let rightSum = Scalar.giniSum(right.values());
        let splitIndex = 0;
        let maxGiniPurity = rightSum / rightTotal ** 2;
        let i = 0;
        while (i < labelledData.length) {
            let next: number;
            let dataPoint = labelledData[i];
            let [features, category] = dataPoint;
            const previous = features.get(key) as unknown as number;
            do {
                const leftCategoryCount = left.get(category) || 0;
                const rightCategoryCount = right.get(category) || 0;
                const leftDifferenceOfSquares = leftCategoryCount * 2 + 1;
                const rightDifferenceOfSquares = (rightCategoryCount - 1) * 2 + 1;
                rightSum -= rightDifferenceOfSquares;
                leftSum += leftDifferenceOfSquares;
                left.set(category, leftCategoryCount + 1);
                right.set(category, rightCategoryCount - 1);
                --rightTotal;
                ++i;
                if (i >= labelledData.length) break;
                [features, category] = labelledData[i];
                next = features.get(key) as unknown as number;
            } while (next === previous);
            const leftTotal = total - rightTotal;
            const leftPurity = leftTotal ? leftSum / (leftTotal * total) : 0;
            const rightPurity = rightTotal ? rightSum / (rightTotal * total) : 0;
            const giniPurity = leftPurity + rightPurity
            if (giniPurity >= maxGiniPurity) {
                splitIndex = i;
                maxGiniPurity = giniPurity;
                console.log(giniPurity);
            }
        }
        let potentialFork: PotentialFork<K, V, C, number>;
        console.log(this.key, splitIndex, labelledData.length);
        if (splitIndex < 1 || splitIndex >= labelledData.length)
            potentialFork = null
        else {
            const maxLeft = labelledData[splitIndex - 1][0].get(key) as unknown as number;
            const minRight = labelledData[splitIndex][0].get(key) as unknown as number;
            potentialFork = {
                conditionalData: maxLeft + (maxLeft - minRight) / 2,
                branches: [
                    labelledData.slice(0, splitIndex),
                    labelledData.slice(splitIndex),
                    unlabelledData,
                ],
                type: ForkType.SCALAR,
            }
        }

        return potentialFork;
    }
}