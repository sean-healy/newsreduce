import { Node } from "./Node";
import { Fork } from "./Fork";
import { ForkType } from "./ForkType";

export class Leaf<C> extends Fork<Leaf<C>> {
    readonly category: C;

    protected toJSONEtc() {
        return { ...this }
    }

    type() {
        return ForkType.LEAF;
    }
}