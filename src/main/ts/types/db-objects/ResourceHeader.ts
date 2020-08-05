import { DBObject } from "types/DBObject";
import { ResourceURL } from "types/db-objects/ResourceURL";
import { HTTPHeader } from "types/db-objects/HTTPHeader";

export class ResourceHeader extends DBObject<ResourceHeader> {
    readonly resource: ResourceURL;
    readonly header: HTTPHeader;

    constructor(url?: string, name?: string, value?: string) {
        if (url) super({
            resource: new ResourceURL(url),
            header: new HTTPHeader(name, value),
        });
        else super();
    }

    insertCols(): string[] {
        return ["resource", "header"];
    }
    getInsertParams(): any[] {
        return [this.resource.getID(), this.header.getID()];
    }
    table(): string {
        return "ResourceHeader";
    }
    getDeps() {
        return [this.resource, this.header];
    }
}
