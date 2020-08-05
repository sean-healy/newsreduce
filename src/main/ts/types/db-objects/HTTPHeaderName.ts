import { SimpleHashObject } from "./SimpleHashObject";

export class HTTPHeaderName extends SimpleHashObject<HTTPHeaderName> {
    table(): string {
        return "HTTPHeaderName";
    }
}
