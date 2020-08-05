import { DBObject } from "types/DBObject";
import { ResourceURL } from "types/db-objects/ResourceURL";

export class WikiPage extends DBObject<WikiPage> {
    readonly resource: ResourceURL;

    constructor(url?: string) {
        super({
            resource: new ResourceURL(url),
        });
    }

    insertCols(): string[] {
        return ["resource"];
    }
    getInsertParams(): any[] {
        return [this.resource.getID()];
    }
    table(): string {
        return "WikiPage";
    }
    idCol(): string {
        return "resource";
    }
}
