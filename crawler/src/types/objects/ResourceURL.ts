import { DBObject } from "types/DBObject";
import { ResourceURLQuery } from "types/objects/ResourceURLQuery";
import { ResourceURLPath } from "types/objects/ResourceURLPath";
import { Host } from "types/objects/Host";
import { write } from "file";
import { Entity } from "types/Entity";
import { FileFormat } from "types/FileFormat";
import { log } from "common/logging";
import { renewRedis, REDIS_PARAMS } from "common/connections";
import { STR_ONE } from "common/util";

const URL_ENCODING = "utf8";
const PORT_BASE = 10;

export class ResourceURL extends DBObject<ResourceURL> {
    readonly ssl: boolean;
    readonly host: Host;
    readonly port: number;
    readonly path: ResourceURLPath;
    readonly query: ResourceURLQuery;

    constructor(arg?: string | { [key in keyof ResourceURL]?: string | number | boolean }) {
        if (!arg) super();
        else if (typeof arg === "string") {
            const groups = arg.match(/^http(s)?:\/\/([^\/:?#]+)(:\d+)?(\/[^?#]*)?(\?[^#]*)?(#.*)?$/);
            if (groups) {
                const ssl = !!groups[1];
                const port = groups[3] ? parseInt(groups[3].substr(1)) : ssl ? 443 : 80;
                if (!port) log("error", "port should be truthy", arg);
                super({
                    ssl,
                    host: new Host({ name: groups[2] }),
                    port,
                    path: new ResourceURLPath({ value: groups[4] ? groups[4] : "" }),
                    query: new ResourceURLQuery({ value: groups[5] ? groups[5].substr(1) : "" }),
                });
            } else {
                throw new Error(`invalid url: ${arg}`);
            }
        } else {
            if (!arg.port) log("error", "port should be truthy", JSON.stringify(arg));
            super({
                ssl: !!arg.ssl,
                host: new Host({ name: arg.host as string }),
                port: arg.port as number,
                path: new ResourceURLPath({ value: arg.path as string }),
                query: new ResourceURLQuery({ value: arg.query as string }),
            });
        }
    }

    toURL() {
        if (!this.port) log("error", "port should be truthy in toURL", JSON.stringify(this));
        const protocol = this.ssl ? "https://" : "http://";
        let length = protocol.length;
        let portString: string = "";
        if (this.port === 443) {
            if (!this.ssl) portString = "443";
        } else if (this.port === 80) {
            if (this.ssl) portString = "80";
        } else
            portString = this.port.toString(PORT_BASE);
        length += portString ? 1 : 0;
        length += Buffer.byteLength(portString, URL_ENCODING);
        length += Buffer.byteLength(this.host.name, URL_ENCODING);
        length += Buffer.byteLength(this.path.value, URL_ENCODING);
        length += Buffer.byteLength(this.query.value, URL_ENCODING);
        length += this.query.value ? 1 : 0;
        const url = Buffer.alloc(length);
        let i = 0;
        i += url.write(protocol, i, URL_ENCODING);
        i += url.write(this.host.name, i, URL_ENCODING)
        if (portString) i += url.write(":", i, URL_ENCODING);
        i += url.write(portString, i, URL_ENCODING);
        i += url.write(this.path.value, i, URL_ENCODING);
        if (this.query.value) i += url.write("?", i, URL_ENCODING);
        i += url.write(this.query.value, i, URL_ENCODING);

        return url.toString(URL_ENCODING);
    }

    hashPrefix(): string {
        return "resource-url";
    }
    hashSuffix(): string {
        return this.toURL();
    }
    insertCols() {
        return ["id", "ssl", "host", "port", "path", "query"];
    }
    getInsertParams(): any[] {
        return [this.getID(), this.ssl, this.host.getID(), this.port, this.path.getID(), this.query.getID()];
    }
    table(): string {
        return "ResourceURL";
    }
    getDeps() {
        return [this.host, this.path, this.query];
    }
    writeVersion(version: number, format: FileFormat, input: string | Buffer | NodeJS.ReadableStream) {
        const id = this.getID();
        // Wait 60 seconds before attempting to compress the outer dir.
        renewRedis(REDIS_PARAMS.fileLock).setex(id.toString(), 15, STR_ONE);
        log("Writing", FileFormat[format]);

        return write(Entity.RESOURCE, id, version, format, input);
    }
    fetchLocked() {
        return new Promise<boolean>((res, rej) =>
            renewRedis(REDIS_PARAMS.fetchLock).get(this.toURL(), (err, response) =>
                err ? rej(err) : res(response === STR_ONE)));
    }
    fetchLock() {
        renewRedis(REDIS_PARAMS.fetchLock).setex(this.toURL(), 60, STR_ONE);
    }
    static async popForFetching(host: string) {
        const url: string = await new Promise<any>((res, rej) =>
            renewRedis(REDIS_PARAMS.fetchSchedule).zpopmax([host, 1], (err, reply) =>
                err ? rej(err) : res(reply && reply.length !== 0 ? reply[0] : null)));
        if (url) new ResourceURL(url).fetchLock();

        return new ResourceURL(url);
    }
    static async popForProcessing() {
        const url = await new Promise<string>((res, rej) =>
            renewRedis(REDIS_PARAMS.processQueues).spop("html", async (err, url) => err ? rej(err) : res(url)));
        if (!url) return null;

        return new ResourceURL(url);
    }
}
