import { DBObject } from "types/DBObject";

export class Host extends DBObject<Host> {
    readonly name: string;
    readonly throttle: number;

    hashPrefix(): string {
        return "host";
    }
    hashSuffix(): string {
        return this.name;
    }
    insertCols(): string[] {
        return ["id", "name", "throttle"];
    }
    getInsertParams(): any[] {
        return [this.getID(), this.name, this.throttle ? this.throttle : 1050];
    }
    table(): string {
        return "Host";
    }
}
