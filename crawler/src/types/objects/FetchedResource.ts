import { DBObject } from "../DBObject";
import { ResourceURL } from "./ResourceURL";
import { HTTPHeaderValue } from "./HTTPHeaderValue";

export class FetchedResource extends DBObject<FetchedResource> {
    resource: ResourceURL;
    length: number;
    type: HTTPHeaderValue;

    constructor(url: string, length: number, type: string) {
        super({
            resource: new ResourceURL(url),
            length,
            type: new HTTPHeaderValue({
                value: type,
            }),
        })
    }

    hashPrefix(): string {
        throw new Error("Method not implemented.");
    }
    hashSuffix(): string {
        throw new Error("Method not implemented.");
    }
    getInsertStatement(): string {
        return `insert ignore into FetchedResource(resource, length, type) values ?`
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
