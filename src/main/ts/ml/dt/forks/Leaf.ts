import { Fork } from "./Fork";
import { ForkType } from "./ForkType";

export class Leaf extends Fork<Leaf> {
    readonly label: number;

    protected toJSONEtc() {
        return { ...this }
    }

    type() {
        return ForkType.LEAF;
    }
}