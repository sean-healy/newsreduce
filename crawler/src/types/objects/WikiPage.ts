import { DBObject } from "../DBObject";
import { ResourceURL } from "./ResourceURL";

export class WikiPage extends DBObject<WikiPage> {
    resource: ResourceURL;

    getInsertStatement(): string {
        return `insert ignore into WikiPage(resource) values ? `
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
