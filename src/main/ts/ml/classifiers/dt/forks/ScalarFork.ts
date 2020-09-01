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

    parse(fork: Buffer | any): Fork {
        if (fork instanceof Buffer) fork = JSON.parse(fork.toString());
        const left = Fork.parse(fork.left);
        const right = Fork.parse(fork.right);
        let { pivot, feature } = fork;
        if (feature.match(/^[0-9]+$/))
            feature = BigInt(feature);

        return new ScalarFork({ left, right, pivot, feature });
    }
}