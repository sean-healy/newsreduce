import { SimpleHashObject } from "./SimpleHashObject";

export class ResourceURLPath extends SimpleHashObject<ResourceURLPath> {
    readonly value: string;
    table(): string {
        return "ResourceURLPath";
    }
}
