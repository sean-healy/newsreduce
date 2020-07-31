import { SimpleHashObject } from "./SimpleHashObject";

export class HTTPHeaderValue extends SimpleHashObject<HTTPHeaderValue> {
    readonly value: string;
    table(): string {
        return "HTTPHeaderValue";
    }
}
