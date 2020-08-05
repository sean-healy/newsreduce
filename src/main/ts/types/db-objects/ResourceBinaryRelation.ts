import { ResourceURL } from "./ResourceURL";
import { Predicate } from "./Predicate";
import { DBObject } from "types/DBObject";

export class ResourceBinaryRelation extends DBObject<ResourceBinaryRelation> {
    readonly resource: ResourceURL;
    readonly relation: Predicate;
    readonly polarity: boolean;

    getInsertParams(): any[] {
        return [this.resource.getID(), this.relation.getID(), this.polarity];
    }
    table(): string {
        return "ResourceBinaryRelation";
    }
    insertCols(): string[] {
        return ["resource", "relation", "polarity"];
    }
    getDeps() {
        return [this.resource, this.relation];
    }
}