import { SimpleHashObject } from "./SimpleHashObject";

export class Word extends SimpleHashObject<Word> {
    table(): string {
        return "Word";
    }
}
