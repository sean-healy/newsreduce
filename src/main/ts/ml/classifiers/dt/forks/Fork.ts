import { GenericConstructor } from "types/GenericConstructor";
import { ForkType } from "./ForkType";
import { CompactCTree } from "../forests/AdaBoost";
import { TrainingFile } from "ml/classifiers/TrainingFile";

// No circular dependencies in JavaScript :-(
let CategoricalFork: any = null;
let ScalarFork: any = null;
let Leaf: any = null;

export abstract class Fork<B extends Fork<B> = Fork<any>> extends GenericConstructor<B> {
    static parse(fork: Buffer | any): Fork {
        if (fork instanceof Buffer) fork = JSON.parse(fork.toString());

        let parsedFork: Fork;
        switch (fork.type) {
            case ForkType.CATEGORICAL:
                if (!CategoricalFork) CategoricalFork = require("./CategoricalFork").CategoricalFork;
                parsedFork = new CategoricalFork().parse(fork);
                break;
            case ForkType.SCALAR:
                if (!ScalarFork) ScalarFork = require("./ScalarFork").ScalarFork;
                parsedFork = new ScalarFork().parse(fork);
                break;
            case ForkType.LEAF:
                if (!Leaf) Leaf = require("./Leaf").Leaf;
                parsedFork = new Leaf().parse(fork);
                break;
        }

        return parsedFork;
    }
    static fromCJSON(tree: CompactCTree, file: TrainingFile): Fork {
        const [localID, pivot, cLeft, cRight] = tree;
        const feature = file.lookup(localID);
        let left: Fork;
        if (typeof cLeft === "number") {
            if (!Leaf) Leaf = require("./Leaf").Leaf;
            left = new Leaf({ label: cLeft });
        } else
            left = Fork.fromCJSON(cLeft, file);
        let right: Fork;
        if (typeof cRight === "number") {
            if (!Leaf) Leaf = require("./Leaf").Leaf;
            right = new Leaf({ label: cRight });
        } else
            right = Fork.fromCJSON(cRight, file);
        if (!ScalarFork) ScalarFork = require("./ScalarFork").ScalarFork;

        return new ScalarFork({ left, right, pivot, feature });
    }

    abstract type(): ForkType;

    protected abstract toJSONEtc(): any;

    toJSON() {
        return {
            type: this.type(),
            ...this.toJSONEtc(),
        }
    }
}