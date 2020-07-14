import { DBObject } from "types/DBObject";
import { HTMLNode } from "types/objects/HTMLNode";
import { HTMLAttribute } from "types/objects/HTMLAttribute";

export class HTMLNodeAttribute extends DBObject<HTMLNodeAttribute> {
    readonly node: HTMLNode;
    readonly attribute: HTMLAttribute;

    insertCols(): string[] {
        return ["id", "node", "attribute"];
    }
    getInsertParams(): any[] {
        return [this.node.getID(), this.attribute.getID()];
    }
    table(): string {
        return "HTMLNodeAttribute";
    }
}
