import { DBObject } from "types/DBObject";
import { ResourceURL } from "types/db-objects/ResourceURL";
import { ConstructorArg0 } from "common/util";

export class ResourceRank extends DBObject<ResourceRank> {
    readonly resource: ResourceURL;
    readonly rank: number;

    constructor(arg0?: ConstructorArg0<ResourceRank>, rank?: number) {
        if (typeof arg0 === "string") super({ resource: new ResourceURL(arg0), rank });
        else if (!arg0) super();
        else super(arg0);
    }

    insertCols(): string[] {
        return ["resource", "rank"];
    }
    getInsertParams(): any[] {
        return [this.resource.getID(), this.rank];
    }
    table(): string {
        return "ResourceRank";
    }
    getDeps() {
        return [this.resource];
    }
}

export class ResourceRankByID extends ResourceRank {
    readonly resourceID: bigint;
    readonly rank: number;

    constructor(resourceID: bigint, rank: number) {
        super();
        this.resourceID = resourceID;
        this.rank = rank;
    }

    insertCols(): string[] {
        return ["resource", "`rank`"];
    }
    getInsertParams(): any[] {
        return [this.resourceID, this.rank];
    }
    table(): string {
        return "ResourceRank";
    }
    getDeps() {
        return [];
    }
}