import { DecisionTree } from "./DecisionTree";
import { GenericConstructor } from "types/GenericConstructor";

export class DecisionForest<K, V, C> extends GenericConstructor<DecisionForest<K, V, C>> {
    readonly trees: DecisionTree<K, V, C>[];

    hardClassify(features: Map<K, V>, getDefaultValue: (feature: K) => V) {
        const ballotBox = new Map<C, number>();
        let max = 0;
        let maxC: C = null;
        for (const tree of this.trees) {
            const c = tree.classify(features, getDefaultValue);
            const count = (ballotBox.get(c) || 0) + 1;
            if (count > max) {
                max = count;
                maxC = c;
            }
            ballotBox.set(c, count);
        }

        return maxC;
    }

    fuzzyClassify(features: Map<K, V>, getDefaultValue: (feature: K) => V) {
        const ballotBox = new Map<C, number>();
        let max = 0;
        let maxC: C = null;
        for (const tree of this.trees) {
            const c = tree.classify(features, getDefaultValue);
            const count = (ballotBox.get(c) || 0) + 1;
            if (count > max) {
                max = count;
                maxC = c;
            }
            ballotBox.set(c, count);
        }
        const p = new Array<[C, number]>(ballotBox.size);
        let i = 0;
        for (const [c, votes] of ballotBox) {
            p[i] = [c, votes / this.trees.length];
            ++i;
        }
        p.sort(([, a], [, b]) => b - a);

        return p;
    }

    toJSON() {
        return this.trees.map(tree => tree.toJSON());
    }

    static parse<K, V, C>(forest: Buffer) {
        const jsonTrees: any[] = JSON.parse(forest.toString());
        return new DecisionForest({
            trees: jsonTrees.map(jsonTree => DecisionTree.parse<K, V, C>(jsonTree))
        })
    }
}