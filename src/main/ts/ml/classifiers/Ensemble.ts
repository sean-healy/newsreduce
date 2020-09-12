import { DecisionTree } from "ml/classifiers/dt/trees/DecisionTree";
import { ClassifierType } from "ml/classifiers/ClassifierType";
import { Classifier } from "./Classifier";
import { ClassifierTrainingArgs } from "./args/ClassifierTrainingArgs";
import { VersionType } from "types/db-objects/VersionType";
import { CSVWriter } from "analytics/CSVWriter";

export class Ensemble<K, I extends ClassifierTrainingArgs<K>, E extends Ensemble<K, I, E> = Ensemble<K, I, any>>
extends Classifier<K, I, E> {
    readonly classifiers: DecisionTree<K>[];
    readonly weights: number[];
    readonly decisionThreshold: number;

    fsVersionType(): VersionType {
        throw new Error("Method not implemented.");
    }

    train(args: I, csvWriter: CSVWriter): E {
        throw new Error("unimplemented method: Ensemble<K, I, E>.train");
    }

    hardClassify(features: Map<K, number>) {
        const fuzzyLabels = this.fuzzyClassify(features);
        let posP: number;
        let negP: number;
        for (const [label, p] of fuzzyLabels) {
            if (label === +1) posP = p;
            if (label === -1) negP = p;
        }

        let fuzzyLabel: [number, number];
        if (posP <  this.decisionThreshold) fuzzyLabel = [-1, posP];
        if (posP >= this.decisionThreshold) fuzzyLabel = [+1, posP];

        return fuzzyLabel;
    }

    fuzzyClassify(features: Map<K, number>) {
        const ballotBox = new Map<number, number>();
        let weightSum = 0;
        for (let i = 0; i < this.classifiers.length; ++i) {
            const classifier = this.classifiers[i];
            if (!classifier) break;
            const weight = this.weights[i];
            weightSum += weight;
            const c = classifier.classify(features);
            ballotBox.set(c, (ballotBox.get(c) || 0) + weight);
        }
        const p = new Array<[number, number]>(ballotBox.size);
        let i = 0;
        for (const [c, weight] of ballotBox)
            p[i++] = [c, weight / weightSum];
        p.sort(([, a], [, b]) => b - a);

        return p;
    }

    toJSONEtc(): any {
        return {
            classifiers: this.classifiers.map(tree => tree.toJSON()),
            weights: this.weights,
            decisionThreshold: this.decisionThreshold,
        }
    }

    parse(input: any | Buffer) {
        let json: any;
        if (input instanceof Buffer) json = JSON.parse(input.toString());
        else json = input;
        console.log(json);
        return new Ensemble({
            classifiers: json.classifiers.map((tree: any) => {
                switch (tree.type) {
                    case ClassifierType.DECISION_TREE:
                        return new DecisionTree().parse(tree);
                }
            }),
            weights: json.weights as number[],
            decisionThreshold: json.decisionThreshold,
        }) as E;
    }

    type(): ClassifierType {
        return ClassifierType.ENSEMBLE;
    }
}