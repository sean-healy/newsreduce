import { DBObject } from "types/DBObject";
import { ResourceURL } from "./ResourceURL";

export class NewsSourceWiki extends DBObject<NewsSourceWiki> {
    readonly resource: ResourceURL;
    readonly p: number;

    table(): string {
        return "NewsSourceWiki";
    }

    insertCols(): string[] {
        return ["resource", "p"];
    }
    getInsertParams(): any[] {
        return [this.resource.getID(), this.p];
    }
    getDeps() {
        return [this.resource];
    }
    toString() {
        return this.resource.toURL();
    }
}