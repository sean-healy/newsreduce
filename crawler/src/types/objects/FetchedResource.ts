import { DBObject } from "types/DBObject";
import { ResourceURL } from "types/objects/ResourceURL";
import { HTTPHeaderValue } from "types/objects/HTTPHeaderValue";

export class FetchedResource extends DBObject<FetchedResource> {
    readonly resource: ResourceURL;
    readonly length: number;
    readonly type: HTTPHeaderValue;
    readonly modified: number;

    constructor(url?: string, length?: number, type?: string) {
        if (url)
            super({
                resource: new ResourceURL(url),
                length,
                type: new HTTPHeaderValue({
                    value: type,
                }),
            });
        else super();
    }

    insertCols(): string[] {
        return ["resource", "length", "type", "modified"]
    }
    getInsertParams(): any[] {
        return [this.resource.getID(), this.length, this.type.getID(), this.modified ? this.modified : Date.now()];
    }
    table(): string {
        return "FetchedResource";
    }
    idCol(): string {
        return "resource";
    }
}
