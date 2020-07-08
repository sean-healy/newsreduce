import { DBObject } from "types/DBObject";
import { Client } from "types/objects/Client";
import { HTTPHeader } from "types/objects/HTTPHeader";

export class ClientHeader extends DBObject<ClientHeader> {
    readonly client: Client;
    readonly header: HTTPHeader;

    insertCols(): string[] {
        return ["client", "header"];
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
