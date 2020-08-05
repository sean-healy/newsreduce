import { DBObject } from "types/DBObject";
import { Client } from "types/db-objects/Client";
import { HTTPHeader } from "types/db-objects/HTTPHeader";

export class ClientHeader extends DBObject<ClientHeader> {
    readonly client: Client;
    readonly header: HTTPHeader;

    constructor(clientName?: string, headerName?: string, value?: string) {
        if (clientName && headerName && value) super({
            client: new Client({ name: clientName }),
            header: new HTTPHeader(headerName.toLowerCase(), value),
        });
    }

    insertCols(): string[] {
        return ["client", "header"];
    }
    getInsertParams(): any[] {
        return [this.client.getID(), this.header.getID()];
    }
    table(): string {
        return "ClientHeader";
    }
    getDeps() {
        return [this.client, this.header];
    }
}
