import { DBObject } from "types/DBObject";
import { ResourceURL } from "types/db-objects/ResourceURL";

export class WikiCategory extends DBObject<WikiCategory> {
    readonly parent: ResourceURL;
    readonly child: ResourceURL;

    insertCols(): string[] {
        return ["parent", "child"];
    }
    getInsertParams(): any[] {
        return [this.parent.getID(), this.child.getID()];
    }
    table(): string {
        return "WikiCategory";
    }
    getDeps() {
        return [this.parent, this.child];
    }
}
