import { DBObject } from "../DBObject";
import { HTMLNode } from "./HTMLNode";
import { HTMLAttribute } from "./HTMLAttribute";

export class HTMLNodeAttribute extends DBObject<HTMLNodeAttribute> {
    node: HTMLNode;
    attribute: HTMLAttribute;

    getInsertStatement(): string {
        return `insert ignore into HTMLNodeAttribute(id, node, attribute) values ? `
    }
    getInsertParams(): any[] {
        return [this.node.getID(), this.attribute.getID()];
    }
    hashPrefix(): string {
        throw new Error("Method not implemented.");
    }
    hashSuffix(): string {
        throw new Error("Method not implemented.");
    }
    table(): string {
        return "HTMLNodeAttribute";
    }
}
