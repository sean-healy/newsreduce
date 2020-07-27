import { SimpleHashObject } from "./SimpleHashObject";

export class HTMLAttributeName extends SimpleHashObject<HTMLAttributeName> {
    readonly value: string;
    table(): string {
        return "HTMLAttributeName";
    }
}
