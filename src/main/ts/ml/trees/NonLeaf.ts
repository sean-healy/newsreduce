import { Fork } from "./Fork";

export abstract class NonLeaf<K, C, N extends NonLeaf<K, C> = any> extends Fork<N> {
    readonly feature: K;

    abstract get(value: boolean | number): Fork;

    next(features: Map<K, boolean | number>) {
        return this.get(features.get(this.feature));
    }

    toJSON() {
        return {
            feature: this.feature,
            ...super.toJSON(),
        }
    }
}