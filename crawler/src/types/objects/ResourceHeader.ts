import { DBObject } from "../DBObject";
import { ResourceURL } from "./ResourceURL";
import { HTTPHeader } from "./HTTPHeader";

export class ResourceHeader extends DBObject<ResourceHeader> {
    resource: ResourceURL;
    header: HTTPHeader;

    constructor(url?: string, name?: string, value?: string) {
        if (!url) super();
        else super({
            resource: new ResourceURL(url),
            header: new HTTPHeader(name, value),
        });
    }

    getInsertStatement(): string {
        return `insert ignore into ResourceHeader(resource, header) values ? `
    }
    getInsertParams(): any[] {
        return [this.resource.getID(), this.header.getID()];
    }
    hashPrefix(): string {
        throw new Error("Method not implemented.");
    }
    hashSuffix(): string {
        throw new Error("Method not implemented.");
    }
    table(): string {
        return "ResourceHeader";
    }
}
