import { DBObject } from "types/DBObject";

type SuperConstructorType<T> = { [key in keyof T]?: T[key] };
type ConstructorType<T> = string | Buffer | SuperConstructorType<T>;

export abstract class SimpleHashObject<T extends SimpleHashObject<T>> extends DBObject<T> {
    readonly value: string | Buffer;

    constructor(arg?: ConstructorType<T>) {
        if (arg === null || arg === undefined) super();
        else if (typeof arg === "string" || arg instanceof Buffer) super({ value: arg } as (SuperConstructorType<T>));
        else super(arg);
    }

    hashSuffix(): string {
        return this.value.toString();
    }
    insertCols(): string[] {
        return ["id", "value"];
    }
    getInsertParams(): any[] {
        return [this.getID(), this.value];
    }
}
