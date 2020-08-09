import { DBObject } from "types/DBObject";
import { ResourceURL } from "./ResourceURL";
import { Key } from "./Key";

export class ResourceKeyValue extends DBObject<ResourceKeyValue> {
    readonly resource: ResourceURL;
    readonly key: Key;
    readonly value: string;

    insertCols(): string[] {
        return ["resource", "key", "value"];
    }
    getInsertParams(): any[] {
        return [this.resource.getID(), this.key.getID(), this.value];
    }
    table(): string {
        return "ResourceKeyValue";
    }
    getDeps() {
        return [this.resource, this.key];
    }
}
