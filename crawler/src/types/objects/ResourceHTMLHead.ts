import { DBObject } from "types/DBObject";
import { ResourceURL } from "types/objects/ResourceURL";
import { HTMLNode } from "types/objects/HTMLNode";

export class ResourceHTMLHead extends DBObject<ResourceHTMLHead> {
    readonly resource: ResourceURL;
    readonly node: HTMLNode;

    insertCols(): string[] {
        return ["resource", "node"];
    }
    getInsertParams(): any[] {
        return [this.resource.getID(), this.node.getID()];
    }
    hashPrefix(): string {
        throw new Error("Method not implemented.");
    }
    hashSuffix(): string {
        throw new Error("Method not implemented.");
    }
    table(): string {
        return "ResourceHTMLHead";
    }
}
