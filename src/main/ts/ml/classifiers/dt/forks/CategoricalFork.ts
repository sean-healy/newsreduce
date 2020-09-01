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

    parse(fork: Buffer | any): Fork {
        if (fork instanceof Buffer) fork = JSON.parse(fork.toString());
        const branches = fork.branches.map((json: any) => Fork.parse(json));
        let { feature } = fork;
        if (feature.match(/^[0-9]+$/))
            feature = BigInt(feature);

        return new CategoricalFork({ branches, feature });
    }
}