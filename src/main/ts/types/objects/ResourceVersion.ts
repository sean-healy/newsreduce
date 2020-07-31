import { DBObject } from "types/DBObject";
import { ResourceURL } from "./ResourceURL";
import { ResourceVersionType } from "./ResourceVersionType";

export class ResourceVersion extends DBObject<ResourceVersion> {
    readonly resource: ResourceURL;
    readonly time: number;
    readonly type: ResourceVersionType;
    readonly length: number;

    insertCols(): string[] {
        return ["resource", "time", "type", "length"];
    }
    getInsertParams(): any[] {
        return [this.resource.getID(), this.time, this.type.getID(), this.length];
    }
    table(): string {
        return "ResourceVersion";
    }
    getDeps() {
        return [this.resource, this.type];
    }
}
