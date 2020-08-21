import { SimpleHashObject } from "./SimpleHashObject";

export class Vector extends SimpleHashObject<Vector> {
    table() {
        return "Vector";
    }
    getInsertParams(): any[] {
        return [this.getID(), this.value.toString("base64")];
    }
}