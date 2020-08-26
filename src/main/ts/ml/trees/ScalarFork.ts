import { Fork } from "./Fork";
import { NonLeaf } from "./NonLeaf";
import { ForkType } from "./ForkType";

export class ScalarFork<K> extends NonLeaf<K, ScalarFork<K>> {
    readonly pivot: number;
    readonly left: Fork;
    readonly right: Fork;

    get(value: number) {
        if (value === undefined) value = 0;
        let fork: Fork;
        if (value < this.pivot) fork = this.left;
        else fork = this.right;
        
        return fork;
    }

    toJSONEtc() {
        return {
            pivot: this.pivot,
            left: this.left.toJSON(),
            right: this.right.toJSON(),
        };
    }

    type() {
        return ForkType.SCALAR;
    }
}