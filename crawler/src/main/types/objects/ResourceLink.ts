import { DBObject } from "types/DBObject";
import { ResourceURL } from "types/objects/ResourceURL";

export class ResourceLink extends DBObject<ResourceLink> {
    readonly parent: ResourceURL;
    readonly child: ResourceURL;

    constructor(
        parentOrObj?: string | { [key in keyof ResourceLink]?: ResourceLink[key] },
        child?: string
    ) {
        if (!parentOrObj) super();
        else if (typeof parentOrObj === "string") super({
            parent: new ResourceURL(parentOrObj),
            child: new ResourceURL(child),
        });
        else super(parentOrObj);
    }

    insertCols(): string[] {
        return ["parent", "child"];
    }
    getInsertParams(): any[] {
        return [this.parent.getID(), this.child.getID()];
    }
    table(): string {
        return "ResourceLink";
    }
    getDeps() {
        return [this.parent, this.child];
    }
    toString() {
        return `${this.parent.toURL()}-->${this.child.toURL()}`;
    }
}
