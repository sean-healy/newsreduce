import { DBObject } from "../DBObject";
import { ResourceLink } from "./ResourceLink";
import { ResourceHash } from "./ResourceHash";

export class ResourceLinkHash extends DBObject<ResourceLinkHash> {
    link: ResourceLink;
    hash: ResourceHash;

    hashPrefix(): string {
        throw new Error("Method not implemented.");
    }
    hashSuffix(): string {
        throw new Error("Method not implemented.");
    }
    getInsertStatement(): string {
        return "insert ignore into ResourceLinkHash(parent, child, position, hash) values ?";
    }
    getInsertParams(): any[] {
        return [this.link.parent.getID(), this.link.child.getID(), this.link.position, this.hash.getID()];
    }
    table(): string {
        return "ResourceLinkHash";
    }
}
