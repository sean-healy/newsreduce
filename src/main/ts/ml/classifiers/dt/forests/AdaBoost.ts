import { Ensemble } from "ml/classifiers/Ensemble";
import { ForestTrainingArgs } from "../args/ForestTrainingArgs";
import { DecisionTree } from "../trees/DecisionTree";
import { fancyLog } from "utils/alpha";
import { TrainingData } from "../../../TrainingData";
import { VersionType } from "types/db-objects/VersionType";
import { CSVWriter } from "analytics/CSVWriter";
import { TrainingFile } from "ml/classifiers/TrainingFile";

type LocalID = number;
type Pivot = number;
export type CompactCTree = [LocalID, Pivot, number | CompactCTree, number | CompactCTree];

interface CompactJSONEncoding {
    decisionThreshold: number;
    weights: number[];
    trees: CompactCTree[];
}

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

    train(args: ForestTrainingArgs<K>, csvWriter: CSVWriter) {
        if (!args.depth) args.depth = DecisionTree.DEFAULT_DEPTH;
        if (!args.features) args.features = DecisionTree.processFeatureMetaData(args.data);
        const trees = new Array<DecisionTree<K>>(args.trees);
        const weights = new Array<number>(args.trees);
        const adaBoost = new AdaBoost({
            classifiers: trees, weights,
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
            weights[i] = alpha;
            trees[i] = tree;
            args.data.updateWeights(tree, epsilon, alpha);
            //console.log(new Set(args.data.weights.concat().sort((a, b) => b - a)));
            this.printProgress(args, adaBoost, i + 1, csvWriter);
        }

        return adaBoost;
    }

    static fromCJSON<K>(json: CompactJSONEncoding, file: TrainingFile<K>) {
        const { decisionThreshold, trees: cTrees, weights } = json;
        const classifiers = [];
        for (const cTree of cTrees) {
            classifiers.push(DecisionTree.fromCJSON(cTree, file));
        }

        return new AdaBoost<K>({ decisionThreshold, weights, classifiers });
    }
}