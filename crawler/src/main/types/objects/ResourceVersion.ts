import { DBObject } from "types/DBObject";
import { ResourceURL } from "./ResourceURL";
import { ResourceVersionType } from "./ResourceVersionType";
import { fancyLog } from "common/util";

export class ResourceVersion extends DBObject<ResourceVersion> {
    readonly resource: ResourceURL;
    readonly time: number;
    readonly type: ResourceVersionType;
    readonly length: number;

    insertCols(): string[] {
        return ["resource", "time", "type", "length"];
    }
    getInsertParams(): any[] {
        const id = this.resource.getID();
        const params = [id, this.time, this.type.getID(), this.length];
        fancyLog("getInsertParams");
        console.log(params);

        return params;
    }
    table(): string {
        return "ResourceVersion";
    }
    getDeps() {
        const deps = [this.resource, this.type];
        fancyLog("got deps")
        console.log(deps);

        return deps;
    }
}
