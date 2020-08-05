import { SimpleHashObject } from "./SimpleHashObject";

export class HTMLAttributeValue extends SimpleHashObject<HTMLAttributeValue> {
    table(): string {
        return "HTMLAttributeValue";
    }
}
