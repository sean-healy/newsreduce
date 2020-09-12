import { ResourceURL } from "./ResourceURL";
import { Predicate } from "./Predicate";
import { DBObject } from "types/DBObject";
import { Label } from "./Label";

export class ResourceFuzzyLabel extends DBObject<ResourceFuzzyLabel> {
    readonly resource: ResourceURL;
    readonly predicate: Predicate;
    readonly label: Label;
    p: number;

    getInsertParams() {
        return [this.resource.getID(), this.predicate.getID(), this.label.getID(), this.p];
    }
    table() {
        return "ResourceFuzzyLabel"
    }
    insertCols(): string[] {
        return ["resource", "predicate", "label", "p"];
    }
    getDeps() {
        return [this.resource, this.predicate, this.label];
    }
    asString() {
        return `${this.resource.path.value}: ${this.label.value} (${this.p})`
    }
}