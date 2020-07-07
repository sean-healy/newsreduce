import { DBObject } from "../DBObject";
import { ResourceURL } from "./ResourceURL";
import { HTMLNode } from "./HTMLNode";

export class ResourceHTMLHead extends DBObject<ResourceHTMLHead> {
    resource: ResourceURL;
    node: HTMLNode;

    getInsertStatement(): string {
        return `insert ignore into ResourceHTMLHead(resource, node) values ? `
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
