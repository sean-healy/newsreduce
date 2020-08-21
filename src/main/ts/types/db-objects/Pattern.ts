import { SimpleHashObject } from "./SimpleHashObject";

export class Pattern extends SimpleHashObject<Pattern> {
    table(): string {
        return "Pattern";
    }
}
