import { DecisionForest } from "./DecisionForest";
import { ForestMetaData } from "./ForestMetaData";
import { DecisionTree } from "./DecisionTree";
import { TrainingData } from "./TrainingData";
import { fancyLog } from "utils/alpha";
import { WeightedTrainingDataPoint } from "./WeightedTrainingDataPoint";
import { WeightedTrainingData } from "./WeightedTrainingData";

export class AdaBoost<K> extends DecisionForest<K, AdaBoost<K>> {
    readonly stumpWeights: number[];

    calculateWeightedError(
        weightedData: WeightedTrainingData<K>,
        tree: DecisionTree<K>,
    ) {
        let epsilon = 0;
        for (const [features, actual, weight] of weightedData) {
            const expected = tree.classify(features);
            if (actual !== expected)
                epsilon += weight;
        }

        return epsilon;
    }

    calculateAlpha(epsilon: number) {
        return Math.log((1 - epsilon) / epsilon) / 2;
    }

    updateWeights(
        weightedData: WeightedTrainingData<K>,
        tree: DecisionTree<K>,
        epsilon: number,
        alpha: number,
    ) {
        for (let j = 0; j < weightedData.length; ++j) {
            const [features, actualCategory, weight] = weightedData[j];
            const expectedCategory = tree.classify(features);
            const pow = actualCategory === expectedCategory ? 1 : -1;
            const numer = weight * Math.exp(-alpha * pow);
            const denom = 2 * Math.sqrt(epsilon * (1 - epsilon));
            weightedData[j][2] =  numer / denom;
        }
    }

    train(data: TrainingData<K>, metaData: ForestMetaData<K>) {
        const initialWeight = 1 / data.length;
        for (const point of data)
            (point as unknown as WeightedTrainingDataPoint<K>).push(initialWeight);
        const weightedData = data as unknown as WeightedTrainingData<K>;
        if (!metaData.categories) metaData.categories = [...new Set(data.map(([, category]) => category))];
        if (!metaData.depth) metaData.depth = DecisionTree.DEFAULT_DEPTH;
        if (!metaData.features) metaData.features = DecisionTree.processFeatureMetaData(weightedData);
        const trees = new Array<DecisionTree<K>>(metaData.trees);
        const stumpWeights = new Array<number>(metaData.trees);
        const adaBoost = new AdaBoost({
            trees, stumpWeights,
        });
        let tree: DecisionTree<K>, epsilon: number, alpha: number;
        for (let i = 0; i < metaData.trees; ++i) {
            fancyLog(`Training tree #${i + 1}.`);
            tree = new DecisionTree<K>().train(weightedData, metaData);
            //console.log(JSON.stringify(tree.toJSON(), null, 1));
            epsilon = this.calculateWeightedError(weightedData, tree);
            alpha = this.calculateAlpha(epsilon);
            console.log("Error:", epsilon);
            stumpWeights[i] = alpha;
            trees[i] = tree;
            this.updateWeights(weightedData, tree, epsilon, alpha);
            this.printProgress(weightedData, adaBoost);
        }

        return adaBoost;
    }

    fuzzyClassify(features: Map<K, number>) {
        const ballotBox = new Map<number, number>();
        let i: number;
        for (i = 0; i < this.trees.length; ++i) {
            const tree = this.trees[i];
            if (!tree) break;
            const c = tree.classify(features);
            const count = (ballotBox.get(c) || 0) + this.stumpWeights[i];
            ballotBox.set(c, count);
        }
        const p = new Array<[number, number]>(ballotBox.size);
        const length = i + 1;
        i = 0;
        for (const [c, votes] of ballotBox) {
            p[i] = [c, votes / length];
            ++i;
        }
        p.sort(([, a], [, b]) => b - a);

        return p;
    }

    toJSON() {
        return {
            trees: this.trees.map(tree => tree.toJSON()),
            stumpWeights: this.stumpWeights,
        };
    }

}