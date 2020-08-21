import { DBObject } from "types/DBObject";
import { VersionType } from "./VersionType";

export abstract class Version<V extends Version<V, T>, T extends DBObject<T>> extends DBObject<V> {
    readonly entity: T;
    readonly time: number;
    readonly type: VersionType;
    readonly length: number;
    readonly created: number;

    insertCols(): string[] {
        return [this.idCol(), "time", "type", "length", "created"];
    }
    getInsertParams(): any[] {
        return [this.entity.getID(), this.time, this.type.getID(), this.length, this.created];
    }
    getDeps() {
        return [this.entity, this.type];
    }
}