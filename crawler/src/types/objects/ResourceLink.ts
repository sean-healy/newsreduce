import { DBObject } from "types/DBObject";
import { ResourceURL } from "types/objects/ResourceURL";

export class ResourceLink extends DBObject<ResourceLink> {
    readonly parent: ResourceURL;
    readonly child: ResourceURL;
    readonly position: number;

    constructor(parent?: string, child?: string) {
        if (parent) super({
            parent: new ResourceURL(parent),
            child: new ResourceURL(child),
        });
    }

    hashPrefix(): string {
        throw new Error("Method not implemented.");
    }
    hashSuffix(): string {
        throw new Error("Method not implemented.");
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
}
