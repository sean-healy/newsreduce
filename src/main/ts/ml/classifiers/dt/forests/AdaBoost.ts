import { Ensemble } from "ml/classifiers/Ensemble";
import { ForestTrainingArgs } from "../args/ForestTrainingArgs";
import { DecisionTree } from "../trees/DecisionTree";
import { fancyLog } from "utils/alpha";
import { TrainingData } from "../../../TrainingData";
import { VersionType } from "types/db-objects/VersionType";

export class AdaBoost<K> extends Ensemble<K, ForestTrainingArgs<K>, AdaBoost<K>> {
    fsVersionType() {
        return VersionType.ADA_BOOST;
    }
    calculateWeightedError(data: TrainingData<K>, tree: DecisionTree<K>) {
        let epsilon = 0;
        for (let i = 0; i < data.length; ++i) {
            const features = data.features[i];
            const actual = data.labels[i];
            const weight = data.weights[i];
            const expected = tree.classify(features);
            if (actual !== expected) {
                epsilon += weight;
            }
        }

        return epsilon;
    }

    calculateAlpha(epsilon: number) {
        return Math.log((1 - epsilon) / epsilon) / 2;
    }

    train(args: ForestTrainingArgs<K>) {
        if (!args.depth) args.depth = DecisionTree.DEFAULT_DEPTH;
        if (!args.features) args.features = DecisionTree.processFeatureMetaData(args.data);
        const trees = new Array<DecisionTree<K>>(args.trees);
        const stumpWeights = new Array<number>(args.trees);
        const adaBoost = new AdaBoost({
            classifiers: trees, weights: stumpWeights,
        });
        let tree: DecisionTree<K>, epsilon: number, alpha: number;
        //console.log(new Set(args.data.weights.concat().sort((a, b) => b - a)));
        for (let i = 0; i < args.trees; ++i) {
            fancyLog(`Training tree #${i + 1}.`);
            tree = new DecisionTree<K>().train(args);
            //console.log(JSON.stringify(tree.toJSON(), null, 1));
            epsilon = this.calculateWeightedError(args.data, tree);
            alpha = this.calculateAlpha(epsilon);
            console.log("Error:", epsilon, "Alpha:", alpha);
            stumpWeights[i] = alpha;
            trees[i] = tree;
            args.data.updateWeights(tree, epsilon, alpha);
            //console.log(new Set(args.data.weights.concat().sort((a, b) => b - a)));
            this.printProgress(args.testData, adaBoost);
        }

        return adaBoost;
    }

    fuzzyClassify(features: Map<K, number>) {
        const ballotBox = new Map<number, number>();
        let i: number;
        for (i = 0; i < this.classifiers.length; ++i) {
            const tree = this.classifiers[i];
            if (!tree) break;
            const c = tree.classify(features);
            const count = (ballotBox.get(c) || 0) + this.weights[i];
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
            trees: this.classifiers.map(tree => tree.toJSON()),
            weights: this.weights,
        };
    }

}