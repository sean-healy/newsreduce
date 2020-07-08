import { DBObject } from "types/DBObject";
import { ResourceLink } from "types/objects/ResourceLink";
import { ResourceHash } from "types/objects/ResourceHash";

export class ResourceLinkHash extends DBObject<ResourceLinkHash> {
    readonly link: ResourceLink;
    readonly hash: ResourceHash;

    constructor(parent?: string, child?: string, hash?: string) {
        if (parent) {
            super({
                link: new ResourceLink(parent, child),
                hash: new ResourceHash(hash),
            });
        }
    }

    hashPrefix(): string {
        throw new Error("Method not implemented.");
    }
    hashSuffix(): string {
        throw new Error("Method not implemented.");
    }
    insertCols(): string[] {
        return ["parent", "child", "position", "hash"];
    }
    getInsertParams(): any[] {
        return [this.link.parent.getID(), this.link.child.getID(), this.link.position, this.hash.getID()];
    }
    table(): string {
        return "ResourceLinkHash";
    }
    getDeps() {
        return [this.link, this.hash];
    }
}
