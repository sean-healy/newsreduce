import { ResourceURL } from "./ResourceURL";
import { Predicate } from "./Predicate";
import { DBObject } from "types/DBObject";

export class ResourceFuzzyPredicate extends DBObject<ResourceFuzzyPredicate> {
    readonly resource: ResourceURL;
    readonly predicate: Predicate;
    readonly p: number;

    getInsertParams() {
        return [this.resource.getID(), this.predicate.getID(), this.p];
    }
    table() {
        return "ResourceFuzzyPredicate"
    }
    insertCols(): string[] {
        return ["resource", "predicate", "p"];
    }
}