import { DBObject } from "types/DBObject";
import { ResourceURL } from "./ResourceURL";

export class NewsSourceHomepage extends DBObject<NewsSourceHomepage> {
    readonly wiki: ResourceURL;
    readonly homepage: ResourceURL;
    readonly p: number;

    table(): string {
        return "NewsSourceHomepage";
    }

    insertCols(): string[] {
        return ["wiki", "homepage", "p"];
    }
    getInsertParams(): any[] {
        return [
            this.wiki.getID(),
            this.homepage.getID(),
            this.p
        ];
    }
    getDeps() {
        return [this.wiki, this.homepage];
    }
    toString() {
        return this.wiki.toURL();
    }
}