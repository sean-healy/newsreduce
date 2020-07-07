import { DBObject } from "../DBObject";

export class Host extends DBObject<Host> {
    name: string;
    throttle: number;

    hashPrefix(): string {
        return "host";
    }
    hashSuffix(): string {
        return this.name;
    }
    getInsertStatement(): string {
        return "insert ignore into Host(id, name, throttle) values ?";
    }
    getInsertParams(): any[] {
        return [this.getID(), this.name, this.throttle];
    }
    table(): string {
        return "HTTPHost";
    }
}
