import { Fork as Fork } from "./Fork";
import { NonLeaf } from "./NonLeaf";
import { ForkType } from "./ForkType";

export class CategoricalFork<K, V, C> extends NonLeaf<K, V, C, CategoricalFork<K, V, C>> {
    readonly branches: Map<V, Fork>;

    get(value: V) {
        return this.branches.get(value);
    }

    toJSONEtc() {
        return {
            branches: [...this.branches.entries()].map(([v, f]) => [v, f.toJSON()]),
        }
    }

    type() {
        return ForkType.CATEGORICAL;
    }
}