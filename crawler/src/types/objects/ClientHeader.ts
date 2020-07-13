import { DBObject } from "types/DBObject";
import { Client } from "types/objects/Client";
import { HTTPHeader } from "types/objects/HTTPHeader";

export class ClientHeader extends DBObject<ClientHeader> {
    readonly client: Client;
    readonly header: HTTPHeader;

    constructor(client?: string, name?: string, value?: string) {
        if (client && name && value) super({
            client: new Client({ name }),
            header: new HTTPHeader(name, value),
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
