import { FeatureType } from "./FeatureType"
import { GenericConstructor } from "types/GenericConstructor";
import { TrainingData } from "../../TrainingData";
import { ScoredPotentialFork } from "../dt/ScoredPotentialFork";
import { Fork } from "../dt/forks/Fork";

export abstract class Feature<K, D = any, F extends Feature<K, D, F> = Feature<K, any, any>>
extends GenericConstructor<F> {
    readonly key: K;
    readonly occurrences: number[];

    abstract type(): FeatureType;

    abstract bestSplit(data: TrainingData<K>): ScoredPotentialFork<K, D>;
    abstract bestFinalSplit(data: TrainingData<K>): ScoredPotentialFork<K, Fork>;

    static calculateMaxCategory(categoryWeights: [number, number]) {
        return categoryWeights[0] < categoryWeights[1] ? 1: 0;
    }

    static calculateWeightedErrors(categoryWeights: [number, number], actualCategory: number) {
        return categoryWeights[actualCategory ^ 1];
    }

    // https://en.wikipedia.org/wiki/Decision_tree_learning#Gini_impurity
    static giniImpurity(categoryWeights: IterableIterator<number> | number[]) {
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

    static leftRightGiniImpurity(leftRight: [[number, number], [number, number]]) {
        const [left, right] = leftRight;
        const leftCount = left[0] + left[1];
        const rightCount = right[0] + right[1];
        const totalCount = leftCount + rightCount;
        const leftPortion = leftCount / totalCount;
        const rightPortion = rightCount / totalCount;
        const total = leftCount + rightCount;
        const leftImpurity = Feature.giniImpurity(left)
        const rightImpurity = Feature.giniImpurity(right)

        return leftImpurity * leftPortion + rightImpurity * rightPortion;
    }

}