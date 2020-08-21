import { DBObject } from "types/DBObject";
import { Vector } from "./Vector";
import { WordVectorSource } from "./WordVectorSource";
import { ResourceURL } from "./ResourceURL";

export class ResourceVector extends DBObject<ResourceVector> {
    readonly resource: ResourceURL;
    source: WordVectorSource;
    readonly vector: Vector;

    getDeps() {
        return [this.resource, this.source, this.vector];
    }
    getInsertParams(): any[] {
        return [this.resource.getID(), this.source.resource.getID(), this.vector.getID()];
    }
    table(): string {
        return "ResourceVector";
    }
    insertCols(): string[] {
        return ["resource", "source", "vector"];
    }
}
