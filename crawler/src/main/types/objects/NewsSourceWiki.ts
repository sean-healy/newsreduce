import { DBObject } from "types/DBObject";
import { ResourceURL } from "types/objects/ResourceURL";

export class NewsSourceWiki extends DBObject<NewsSourceWiki> {
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
        return "NewsSourceWiki";
    }
    idCol(): string {
        return "resource";
    }
}
