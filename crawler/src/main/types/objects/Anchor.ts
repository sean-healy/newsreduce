import { DBObject } from "types/DBObject";

export class Anchor extends DBObject<Anchor> {
    readonly value: string;

    constructor(arg: string | { [key in keyof Anchor]?: Anchor[key] }) {
        if (arg === null || arg === undefined) super();
        else if (typeof arg === "string")
            super({ value: arg });
        else {
            const { value } = arg;
            super({ value });
        }
    }

    hashSuffix(): string {
        return this.value;
    }
    insertCols(): string[] {
        return ["id", "value"];
    }
    getInsertParams(): any[] {
        return [this.getID(), this.value];
    }
    table(): string {
        return "Anchor";
    }
}
