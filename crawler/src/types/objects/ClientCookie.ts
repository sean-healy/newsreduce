import { DBObject } from "types/DBObject";
import { Client } from "types/objects/Client";
import { Host } from "types/objects/Host";

export class ClientCookie extends DBObject<ClientCookie> {
    readonly client: Client;
    readonly host: Host;
    readonly value: string;

    insertCols(): string[] {
        return ["client", "host", "value"];
    }
    getInsertParams(): any[] {
        return [this.client.getID(), this.host.getID(), this.value];
    }
    hashPrefix(): string {
        throw new Error("Method not implemented.");
    }
    hashSuffix(): string {
        throw new Error("Method not implemented.");
    }
    table(): string {
        return "ClientCookie"
    }
    idCol(): string {
        throw new Error("Method not implemented.");
    }
}
