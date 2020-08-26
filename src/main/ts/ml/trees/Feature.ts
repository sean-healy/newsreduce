import { FeatureType } from "./FeatureType"
import { GenericConstructor } from "types/GenericConstructor";
import { WeightedTrainingData } from "./WeightedTrainingData";
import { ScoredPotentialFork } from "./ScoredPotentialFork";

export abstract class Feature<K, D = any, F extends Feature<K, D, F> = Feature<K, any, any>>
extends GenericConstructor<F> {
    readonly key: K;
    readonly occurrences: number[];

    abstract type(): FeatureType;

    abstract bestWeightedSplit(data: WeightedTrainingData<K>): ScoredPotentialFork<K, D>;

    static calculateMaxCategory(categoryWeights: [number, number]) {
        return categoryWeights[0] < categoryWeights[1] ? 1: 0;
    }

    static calculateWeightedErrors(categoryWeights: [number, number], actualCategory: number) {
        return categoryWeights[actualCategory ^ 1];
    }

    // https://en.wikipedia.org/wiki/Decision_tree_learning#Gini_impurity
    static giniImpurity(categoryWeights: IterableIterator<number>) {
        let total = 0;
        let sum = 0;
        for (const weight of categoryWeights) {
            total += weight;
            sum += weight ** 2;
        }

        return 1 - sum / total ** 2;
    }

    static mappedGiniImpurity<D>(data: D[], mapper: (point: D) => number) {
        let total = 0;
        let sum = 0;
        for (const point of data) {
            const weight = mapper(point);
            total += weight;
            sum += weight ** 2;
        }

        return 1 - sum / total ** 2;
    }

    static leftRightGiniImpurity(leftRight: [WeightedTrainingData<any>, WeightedTrainingData<any>]) {
        const [left, right] = leftRight;
        const leftCount = left.length;
        const rightCount = right.length;
        const total = leftCount + rightCount;
        const leftImpurity = Feature.mappedGiniImpurity(left, row => row[2]);
        const rightImpurity = Feature.mappedGiniImpurity(left, row => row[2]);

        return leftImpurity * (leftCount / total) + rightImpurity * (rightCount / total);
    }

}