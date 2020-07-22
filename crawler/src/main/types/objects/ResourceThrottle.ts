import { DBObject } from "types/DBObject";
import { ResourceURL } from "./ResourceURL";

export class ResourceThrottle extends DBObject<ResourceThrottle> {
    readonly resource: ResourceURL;
    readonly throttle: number;

    insertCols(): string[] {
        return ["resource", "throttle"];
    }
    getInsertParams(): any[] {
        return [this.resource.getID(), this.throttle];
    }
    table(): string {
        return "ResourceThrottle";
    }
    idCol() {
        return "resource";
    }
    getDeps() {
        return [this.resource];
    }
}
