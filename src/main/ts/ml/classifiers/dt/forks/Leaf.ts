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

    static parse(fork: Buffer | any): Fork {
        if (fork instanceof Buffer) fork = JSON.parse(fork.toString());
        const { label } = fork;

        return new Leaf({ label });
    }
}