import { DBObject } from "../DBObject";
import { Client } from "./Client";
import { Host } from "./Host";

export class ClientCookie extends DBObject<ClientCookie> {
    client: Client;
    host: Host;
    value: string;

    getInsertStatement(): string {
        return `insert ignore into ClientCookie(client, host, value) values ?`
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
