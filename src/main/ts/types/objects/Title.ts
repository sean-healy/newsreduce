import { SimpleHashObject } from "./SimpleHashObject";

export class Title extends SimpleHashObject<Title> {
    readonly value: string;
    table(): string {
        return "Title";
    }
}
