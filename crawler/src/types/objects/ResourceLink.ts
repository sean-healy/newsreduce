import { DBObject } from "../DBObject";
import { ResourceURL } from "./ResourceURL";

export class ResourceLink extends DBObject<ResourceLink> {
    parent: ResourceURL;
    child: ResourceURL;
    position: number;

    hashPrefix(): string {
        throw new Error("Method not implemented.");
    }
    hashSuffix(): string {
        throw new Error("Method not implemented.");
    }
    getInsertStatement(): string {
        return "insert ignore into ResourceLink(parent, child, position) values ?";
    }
    getInsertParams(): any[] {
        return [this.parent.getID(), this.child.getID(), this.position];
    }
    table(): string {
        return "ResourceLink";
    }
}
