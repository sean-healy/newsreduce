import { DBObject } from "../DBObject";
import { ResourceURL } from "./ResourceURL";

export class WikiCategory extends DBObject<WikiCategory> {
    parent: ResourceURL;
    child: ResourceURL;

    getInsertStatement(): string {
        return `insert ignore into WikiCategory(parent, child) values ? `
    }
    getInsertParams(): any[] {
        return [this.parent.getID(), this.child.getID()];
    }
    hashPrefix(): string {
        throw new Error("Method not implemented.");
    }
    hashSuffix(): string {
        throw new Error("Method not implemented.");
    }
    table(): string {
        return "WikiCategory";
    }
}
