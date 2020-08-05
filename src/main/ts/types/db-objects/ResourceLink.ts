import { DBObject } from "types/DBObject";
import { ResourceURL } from "types/db-objects/ResourceURL";
import { Anchor } from "types/db-objects/Anchor";

export class ResourceLink extends DBObject<ResourceLink> {
    readonly parent: ResourceURL;
    readonly child: ResourceURL;
    readonly value: Anchor;

    constructor(
        parentOrObj?: string | { [key in keyof ResourceLink]?: ResourceLink[key] },
        child?: string,
        value?: string,
    ) {
        if (parentOrObj === null || parentOrObj === undefined) super();
        else if (typeof parentOrObj === "string") super({
            parent: new ResourceURL(parentOrObj),
            child: new ResourceURL(child),
            value: new Anchor(value),
        });
        else super(parentOrObj);
    }

    insertCols(): string[] {
        return ["parent", "child", "value"];
    }
    getInsertParams(): any[] {
        return [this.parent.getID(), this.child.getID(), this.value.getID()];
    }
    table(): string {
        return "ResourceLink";
    }
    getDeps() {
        return [this.parent, this.child, this.value];
    }
    toString() {
        return `${this.parent.toURL()}-->${this.child.toURL()}`;
    }
}
