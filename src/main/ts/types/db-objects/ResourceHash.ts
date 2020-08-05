import { SimpleHashObject } from "./SimpleHashObject";

export class ResourceHash extends SimpleHashObject<ResourceHash> {
    readonly value: string;
    table(): string {
        return "ResourceHash";
    }
}
