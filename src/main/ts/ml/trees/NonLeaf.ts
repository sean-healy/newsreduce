import { Fork } from "./Fork";

export abstract class NonLeaf<K, V, C, N extends NonLeaf<K, V, C> = any> extends Fork<N> {
    readonly feature: K;

    abstract get(value: V): Fork;

    next(features: Map<K, V>) {
        return this.get(features.get(this.feature));
    }

    toJSON() {
        return {
            feature: this.feature,
            ...super.toJSON(),
        }
    }
}