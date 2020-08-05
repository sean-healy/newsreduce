import { SimpleHashObject } from "./SimpleHashObject";

export class ResourceURLQuery extends SimpleHashObject<ResourceURLQuery> {
    readonly value: string;
    table(): string {
        return "ResourceURLQuery";
    }
}
