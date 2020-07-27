import { SimpleHashObject } from "./SimpleHashObject";

export class HTMLTag extends SimpleHashObject<HTMLTag> {
    readonly value: string;
    table(): string {
        return "HTMLTag";
    }
}
