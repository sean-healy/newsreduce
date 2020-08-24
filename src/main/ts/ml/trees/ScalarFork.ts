import { Fork } from "./Fork";
import { NonLeaf } from "./NonLeaf";
import { ForkType } from "./ForkType";

export class ScalarFork<K, V extends number, C> extends NonLeaf<K, V, C, ScalarFork<K, V, C>> {
    readonly pivot: number;
    readonly left: Fork;
    readonly right: Fork;
    readonly unlabelled: Fork;

    get(value: V) {
        let fork: Fork;
        if (value === undefined || value === null) fork = this.unlabelled;
        else if (value < this.pivot) fork = this.left;
        else fork = this.right;
        
        return fork;
    }

    toJSONEtc() {
        return {
            pivot: this.pivot,
            left: this.left.toJSON(),
            right: this.right.toJSON(),
            unlabelled: this.unlabelled.toJSON()
        };
    }

    type() {
        return ForkType.SCALAR;
    }
}