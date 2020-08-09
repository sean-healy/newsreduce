import { DBObject } from "types/DBObject";
import { HTMLNode } from "types/db-objects/HTMLNode";
import { HTMLAttribute } from "types/db-objects/HTMLAttribute";

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
    getDeps() {
        return [this.node, this.attribute];
    }
}
