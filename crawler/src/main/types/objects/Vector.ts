import { SimpleHashObject } from "./SimpleHashObject";

export class Vector extends SimpleHashObject<Vector> {
    table() {
        return "Vector";
    }
}