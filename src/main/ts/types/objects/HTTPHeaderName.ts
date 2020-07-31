import { SimpleHashObject } from "./SimpleHashObject";

export class HTTPHeaderName extends SimpleHashObject<HTTPHeaderName> {
    readonly value: string;
    table(): string {
        return "HTTPHeaderName";
    }
}
