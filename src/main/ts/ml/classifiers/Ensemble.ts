import { DecisionTree } from "ml/classifiers/dt/trees/DecisionTree";
import { ClassifierType } from "ml/classifiers/ClassifierType";
import { Classifier } from "./Classifier";
import { ClassifierTrainingArgs } from "./args/ClassifierTrainingArgs";
import { VersionType } from "types/db-objects/VersionType";

export class Ensemble<K, I extends ClassifierTrainingArgs<K>, E extends Ensemble<K, I, E> = Ensemble<K, I, any>>
extends Classifier<K, I, E> {
    readonly classifiers: DecisionTree<K>[];
    readonly weights: number[];

    fsVersionType(): VersionType {
        throw new Error("Method not implemented.");
    }
    train(args: I): E {
        throw new Error("unimplemented method: Ensemble<K, I, E>.train");
    }

    hardClassify(features: Map<K, number>) {
        return this.fuzzyClassify(features)[0];
    }

    fuzzyClassify(features: Map<K, number>) {
        const ballotBox = new Map<number, number>();
        for (const tree of this.classifiers) {
            if (!tree) break;
            const c = tree.classify(features);
            ballotBox.set(c, (ballotBox.get(c) || 0) + 1);
        }
        const p = new Array<[number, number]>(ballotBox.size);
        let i = 0;
        for (const [c, votes] of ballotBox) {
            p[i] = [c, votes / this.classifiers.length];
            ++i;
        }
        p.sort(([, a], [, b]) => b - a);

        return p;
    }

    toJSONEtc(): any {
        return {
            trees: this.classifiers.map(tree => tree.toJSON()),
        }
    }

    parse(input: any | Buffer) {
        let json: any;
        if (input instanceof Buffer) json = JSON.parse(input.toString());
        else json = input;
        return new Ensemble({
            classifiers: json.classifiers.map((tree: any) => {
                switch (tree.type) {
                    case ClassifierType.DECISION_TREE:
                        return new DecisionTree().parse(tree);
                }
            }),
            weights: json.weights as number[],
        }) as E;
    }

    type(): ClassifierType {
        return ClassifierType.ENSEMBLE;
    }
}