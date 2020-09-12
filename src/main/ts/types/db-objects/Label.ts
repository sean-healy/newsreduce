import { SimpleHashObject } from "./SimpleHashObject";

export class Label extends SimpleHashObject<Label> {
    table(): string {
        return "Label";
    }
}
