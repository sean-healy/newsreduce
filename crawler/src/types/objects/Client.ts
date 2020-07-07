import { DBObject } from "../DBObject";

export class Client extends DBObject<Client> {
    name: string;
    httpVersion: string;

    hashPrefix(): string {
        return "client";
    }
    hashSuffix(): string {
        return this.name;
    }
    getInsertStatement(): string {
        return `insert ignore into Client(id, name, httpVersion) values ?`
    }
    getInsertParams(): any[] {
        return [this.getID(), this.name, this.httpVersion];
    }
    table(): string {
        return "Client";
    }
}
