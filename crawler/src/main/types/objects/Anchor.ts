import { SimpleHashObject } from "./SimpleHashObject";

export class Anchor extends SimpleHashObject<Anchor> {
    readonly value: string;
    table(): string {
        return "Anchor";
    }
}
