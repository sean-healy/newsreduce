import { DBObject } from "types/DBObject";
import { VersionType } from "./VersionType";

export abstract class Version<V extends Version<V, T>, T extends DBObject<T>> extends DBObject<V> {
    readonly entity: T;
    readonly time: number;
    readonly type: VersionType;
    readonly length: number;

    insertCols(): string[] {
        return [this.idCol(), "time", "type", "length"];
    }
    getInsertParams(): any[] {
        return [this.entity.getID(), this.time, this.type.getID(), this.length];
    }
    getDeps() {
        return [this.entity, this.type];
    }
}