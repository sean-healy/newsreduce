import { DBObject } from "../DBObject";
import { Client } from "./Client";
import { HTTPHeader } from "./HTTPHeader";

export class ClientHeader extends DBObject<ClientHeader> {
    client: Client;
    header: HTTPHeader;

    getInsertStatement(): string {
        return `insert ignore into ClientHeader(client, header) values ? `
    }
    getInsertParams(): any[] {
        return [this.client.getID(), this.header.getID()];
    }
    hashPrefix(): string {
        throw new Error("Method not implemented.");
    }
    hashSuffix(): string {
        throw new Error("Method not implemented.");
    }
    table(): string {
        return "ClientHeader";
    }
}
