import { DBObject } from "types/DBObject";

export class Client extends DBObject<Client> {
    readonly name: string;
    readonly httpVersion: string;

    hashPrefix(): string {
        return "client";
    }
    hashSuffix(): string {
        return this.name;
    }
    insertCols(): string[] {
        return ["id", "name", "httpVersion"];
    }
    getInsertParams(): any[] {
        return [this.getID(), this.name, this.httpVersion];
    }
    table(): string {
        return "Client";
    }
}
