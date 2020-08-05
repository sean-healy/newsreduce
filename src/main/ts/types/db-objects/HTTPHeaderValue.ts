import { SimpleHashObject } from "./SimpleHashObject";

export class HTTPHeaderValue extends SimpleHashObject<HTTPHeaderValue> {
    table(): string {
        return "HTTPHeaderValue";
    }
}
