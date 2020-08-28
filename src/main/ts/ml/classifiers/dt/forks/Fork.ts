import { GenericConstructor } from "types/GenericConstructor";
import { ForkType } from "./ForkType";

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

    abstract type(): ForkType;

    protected abstract toJSONEtc(): any;

    toJSON() {
        return {
            type: this.type(),
            ...this.toJSONEtc(),
        }
    }
}