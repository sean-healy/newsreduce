import { Node } from "./Node";
import { Fork } from "./Fork";
import { ForkType } from "./ForkType";

export class Leaf extends Fork<Leaf> {
    readonly category: number;

    protected toJSONEtc() {
        return { ...this }
    }

    type() {
        return ForkType.LEAF;
    }
}