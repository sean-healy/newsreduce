import { SimpleHashObject } from "./SimpleHashObject";

export class Word extends SimpleHashObject<Word> {
    readonly value: string;
    table(): string {
        return "Word";
    }
}
