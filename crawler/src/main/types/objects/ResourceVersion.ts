import { DBObject } from "types/DBObject";
import { ResourceURL } from "./ResourceURL";
import { ResourceVersionType } from "./ResourceVersionType";

export class ResourceVersion extends DBObject<ResourceVersion> {
    readonly resource: ResourceURL;
    readonly time: number;
    readonly type: ResourceVersionType;

    insertCols(): string[] {
        return ["resource", "time", "type"];
    }
    getInsertParams(): any[] {
        const params = [this.resource.getID(), this.time, this.type.getID()];

        return params;
    }
    table(): string {
        return "ResourceVersion";
    }
    getDeps() {
        return [this.resource, this.type];
    }
}
