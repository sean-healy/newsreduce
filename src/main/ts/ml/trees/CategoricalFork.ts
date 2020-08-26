import { Fork as Fork } from "./Fork";
import { NonLeaf } from "./NonLeaf";
import { ForkType } from "./ForkType";

export class CategoricalFork<K> extends NonLeaf<K, CategoricalFork<K>> {
    readonly branches: [Fork, Fork];

    get(value: number) {
        return this.branches[value || 0];
    }

    toJSONEtc() {
        return {
            branches: this.branches.map(f => f.toJSON()),
        }
    }

    type() {
        return ForkType.CATEGORICAL;
    }
}