import { DBObject } from "types/DBObject";
import { ResourceURL } from "types/objects/ResourceURL";
import { HTTPHeaderValue } from "types/objects/HTTPHeaderValue";

export class FetchedResource extends DBObject<FetchedResource> {
    readonly resource: ResourceURL;
    readonly length: number;
    readonly type: HTTPHeaderValue;

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
        return ["resource", "length", "type"]
    }
    getInsertParams(): any[] {
        return [this.resource.getID(), this.length, this.type.getID()];
    }
    table(): string {
        return "FetchedResource";
    }
    idCol(): string {
        return "resource";
    }
}
