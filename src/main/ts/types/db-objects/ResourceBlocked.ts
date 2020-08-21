import { DBObject } from "types/DBObject";
import { ResourceURL } from "./ResourceURL";

export class ResourceBlocked extends DBObject<ResourceBlocked> {
    readonly resource: ResourceURL;
    readonly expires: number;

    insertCols(): string[] {
        return ["resource", "expires"];
    }
    getInsertParams(): any[] {
        return [this.resource.getID(), this.expires];
    }
    table(): string {
        return "ResourceBlocked";
    }
    getDeps() {
        return [this.resource];
    }
}
