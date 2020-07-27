import { SimpleHashObject } from "./SimpleHashObject";

export class HTMLAttributeValue extends SimpleHashObject<HTMLAttributeValue> {
    readonly value: string;
    table(): string {
        return "HTMLAttributeValue";
    }
}
