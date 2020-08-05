import { ResourceURL } from "./ResourceURL";
import { Version } from "./Version";

export class ResourceVersion extends Version<ResourceVersion, ResourceURL> {
    table(): string {
        return "ResourceVersion";
    }
    idCol() {
        return "resource";
    }
}
