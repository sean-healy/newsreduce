import { DBObject } from "types/DBObject";
import { ResourceURL } from "types/objects/ResourceURL";

export class WordVectorSource extends DBObject<WordVectorSource> {
    readonly resource: ResourceURL;
    readonly label: string;
    getInsertParams(): any[] {
        return [this.getID(), this.resource.getID(), this.label];
    }
    table(): string {
        return "WordVectorSource";
    }
    insertCols(): string[] {
        return ["id", "resource", "label"];
    }
    hashSuffix(): string {
        return this.label;
    }

    getDeps() {
        return [this.resource];
    }
}
