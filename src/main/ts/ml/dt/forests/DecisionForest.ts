import { DecisionTree } from "../trees/DecisionTree";
import { GenericConstructor } from "types/GenericConstructor";
import { TrainingData } from "../TrainingData";
import { ForestTrainingArgs } from "../args/ForestTrainingArgs";

export class DecisionForest<K, D extends DecisionForest<K, D> = DecisionForest<K, any>>
extends GenericConstructor<D> {
    readonly trees: DecisionTree<K>[];

    train(args: ForestTrainingArgs<K>) {
        throw new Error("unimplemented method: DecisionForest<K, D>.train");
    }

    hardClassify(features: Map<K, number>) {
        return this.fuzzyClassify(features)[0];
    }

    fuzzyClassify(features: Map<K, number>) {
        const ballotBox = new Map<number, number>();
        for (const tree of this.trees) {
            if (!tree) break;
            const c = tree.classify(features);
            ballotBox.set(c, (ballotBox.get(c) || 0) + 1);
        }
        const p = new Array<[number, number]>(ballotBox.size);
        let i = 0;
        for (const [c, votes] of ballotBox) {
            p[i] = [c, votes / this.trees.length];
            ++i;
        }
        p.sort(([, a], [, b]) => b - a);

        return p;
    }

    toJSON(): any {
        return this.trees.map(tree => tree.toJSON());
    }

    static parse<K>(forest: Buffer) {
        const jsonTrees: any[] = JSON.parse(forest.toString());
        return new DecisionForest({
            trees: jsonTrees.map(jsonTree => DecisionTree.parse<K>(jsonTree))
        })
    }

    protected printProgress(data: TrainingData<K>, adaBoost: DecisionForest<K>) {
        let FN = 0;
        let FP = 0;
        let TN = 0;
        let TP = 0;
        for (let i = 0; i < data.length; ++i) {
            const features = data.features[i];
            const actual = data.labels[i];
            const [expected, surety] = adaBoost.hardClassify(features);
            if (expected && actual) ++TP;
            if (!expected && !actual) ++TN;
            if (!expected && actual) {
                ++FN;
            }
            if (expected && !actual) ++FP;
        }
        let Accuracy = Number((((TN + TP) / (TN + TP + FN + FP)) * 100).toFixed(2));
        let Precision = Number(((TP / (TP + FP)) * 100).toFixed(2));
        let Recall = Number(((TP / (TP + FN)) * 100).toFixed(2));
        console.log({ FN, FP, TN, TP, Precision, Recall });
    }
}