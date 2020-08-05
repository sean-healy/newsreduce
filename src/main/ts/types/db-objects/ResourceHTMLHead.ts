import { DBObject } from "types/DBObject";
import { ResourceURL } from "types/db-objects/ResourceURL";
import { HTMLNode } from "types/db-objects/HTMLNode";

export class ResourceHTMLHead extends DBObject<ResourceHTMLHead> {
    readonly resource: ResourceURL;
    readonly node: HTMLNode;

    insertCols(): string[] {
        return ["resource", "node"];
    }
    getInsertParams(): any[] {
        return [this.resource.getID(), this.node.getID()];
    }
    table(): string {
        return "ResourceHTMLHead";
    }
}
