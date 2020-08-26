import { GenericConstructor } from "types/GenericConstructor";
import { ForkType } from "./ForkType";

export abstract class Fork<B extends Fork<B> = Fork<any>> extends GenericConstructor<B> {

    abstract type(): ForkType;

    protected abstract toJSONEtc(): any;

    toJSON() {
        return {
            type: this.type(),
            ...this.toJSONEtc(),
        }
    }
}