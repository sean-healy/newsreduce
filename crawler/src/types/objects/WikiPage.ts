import { DBObject } from "types/DBObject";
import { ResourceURL } from "types/objects/ResourceURL";

export class WikiPage extends DBObject<WikiPage> {
    readonly resource: ResourceURL;

    insertCols(): string[] {
        return ["resource"];
    }
    getInsertParams(): any[] {
        return [this.resource.getID()];
    }
    hashPrefix(): string {
        throw new Error("Method not implemented.");
    }
    hashSuffix(): string {
        throw new Error("Method not implemented.");
    }
    table(): string {
        return "WikiPage";
    }
    idCol(): string {
        return "resource";
    }
}
