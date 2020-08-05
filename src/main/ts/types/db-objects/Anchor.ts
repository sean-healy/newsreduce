import { SimpleHashObject } from "./SimpleHashObject";

export class Anchor extends SimpleHashObject<Anchor> {
    table(): string {
        return "Anchor";
    }
}
