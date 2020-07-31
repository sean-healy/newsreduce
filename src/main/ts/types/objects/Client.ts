import { DBObject } from "types/DBObject";

export class Client extends DBObject<Client> {
    readonly name: string;
    readonly httpVersion: string;

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
