import { DBObject } from "types/DBObject";
import { ResourceURL } from "types/objects/ResourceURL";
import { HTTPHeader } from "types/objects/HTTPHeader";

export class ResourceHeader extends DBObject<ResourceHeader> {
    readonly resource: ResourceURL;
    readonly header: HTTPHeader;

    constructor(url?: string, name?: string, value?: string) {
        if (!url) super();
        else super({
            resource: new ResourceURL(url),
            header: new HTTPHeader(name, value),
        });
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
}
