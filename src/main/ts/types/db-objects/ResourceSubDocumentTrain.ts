import { Predicate } from "./Predicate";
import { ResourceURL } from "./ResourceURL";
import { HTMLAttributeName } from "./HTMLAttributeName";
import { Pattern } from "./Pattern";
import { DBObject } from "types/DBObject";

export class ResourceSubDocumentTrain extends DBObject<ResourceSubDocumentTrain> {
    readonly resource: ResourceURL;
    readonly predicate: Predicate;
    readonly attribute: HTMLAttributeName;
    readonly pattern: Pattern;

    insertCols(): string[] {
        return ["resource", "predicate", "attribute", "pattern"];
    }
    getInsertParams(): any[] {
        return [this.resource.getID(), this.predicate.getID(), this.attribute.getID(), this.pattern.getID()];
    }
    table(): string {
        return "ResourceSubDocumentTrain";
    }
    getDeps() {
        return [this.resource, this.predicate, this.attribute, this.pattern];
    }
}
