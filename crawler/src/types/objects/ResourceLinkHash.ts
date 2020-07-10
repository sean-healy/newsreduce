import { DBObject } from "types/DBObject";
import { ResourceLink } from "types/objects/ResourceLink";
import { ResourceHash } from "types/objects/ResourceHash";

export class ResourceLinkHash extends DBObject<ResourceLinkHash> {
    readonly link: ResourceLink;
    readonly hash: ResourceHash;

    constructor(
        parentOrObj?: string | { [key in keyof ResourceLinkHash]?: ResourceLinkHash[key] },
        child?: string,
        hash?: string
    ) {

        if (!parentOrObj) super();
        else if (typeof parentOrObj === "string")
            super({
                link: new ResourceLink(parentOrObj, child),
                hash: new ResourceHash(hash),
            });
        else super(parentOrObj as any);
    }

    insertCols(): string[] {
        return ["parent", "child", "hash"];
    }
    getInsertParams(): any[] {
        return [this.link.parent.getID(), this.link.child.getID(), this.link, this.hash.getID()];
    }
    table(): string {
        return "ResourceLinkHash";
    }
    getDeps() {
        return [this.link, this.hash];
    }
    toString() {
        return `${this.link.toString()}#${this.hash.value}`;
    }
}
