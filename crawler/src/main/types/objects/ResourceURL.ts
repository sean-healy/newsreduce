import { DBObject } from "types/DBObject";
import { ResourceURLQuery } from "types/objects/ResourceURLQuery";
import { ResourceURLPath } from "types/objects/ResourceURLPath";
import { Host } from "types/objects/Host";
import { write } from "file";
import { Entity } from "types/Entity";
import { FileFormat } from "types/FileFormat";
import { log } from "common/logging";
import { Redis, REDIS_PARAMS } from "common/Redis";
import { FAILURE_CACHE } from "common/events";

const URL_ENCODING = "utf8";
const PORT_BASE = 10;
const URL =
    /^http(s)?:\/\/([^\/:?#]+)(:\d+)?(\/[^?#]*)?(\?[^#]*)?(#.*)?$/;

type ConstructorParam =
    string | { [key in keyof ResourceURL]?: string | number | boolean }

export class ResourceURL extends DBObject<ResourceURL> {
    readonly ssl: boolean;
    readonly host: Host;
    readonly port: number;
    readonly path: ResourceURLPath;
    readonly query: ResourceURLQuery;

    constructor(arg?: ConstructorParam) {
        if (!arg) super();
        else if (typeof arg === "string") {
            const groups = arg.match(URL);
            if (!groups) throw new Error(`invalid url: ${arg}`);
            const ssl = !!groups[1];
            const portStr = groups[3];
            const port = portStr ?
                parseInt(portStr.substr(1)) : ssl ? 443 : 80;
            const path = groups[4] ? groups[4] : "";
            const query = groups[5] ? groups[5].substr(1) : "";
            const host = groups[2];
            if (!host) throw new Error(`invalid url (no host): ${arg}`);
            if (!port) throw new Error(`invalid url (no port): ${arg}`);
            if (!path) throw new Error(`invalid url (no path): ${arg}`);
            if (!query) throw new Error(`invalid url (no query): ${arg}`);
            super({
                ssl,
                host: new Host({ name: host }),
                port,
                path: new ResourceURLPath({ value: path }),
                query: new ResourceURLQuery({ value: query }),
            });
        } else {
            if (!arg.host) throw new Error(`invalid url (no host): ${JSON.stringify(arg)}`);
            if (!arg.port) throw new Error(`invalid url (no port): ${JSON.stringify(arg)}`);
            if (!arg.path) throw new Error(`invalid url (no path): ${JSON.stringify(arg)}`);
            if (!arg.query) throw new Error(`invalid url (no query): ${JSON.stringify(arg)}`);
            super({
                ssl: !!arg.ssl,
                host: new Host({ name: arg.host as any }),
                port: arg.port as number,
                path: new ResourceURLPath({ value: arg.path as any }),
                query: new ResourceURLQuery({ value: arg.query as any }),
            });
        }
    }

    toURL() {
        if (!this.port)
            log("error", "port should be truthy in toURL",
                JSON.stringify(this));
        const protocol = this.ssl ? "https://" : "http://";
        let length = protocol.length;
        let portString: string = "";
        if (this.port === 443) {
            if (!this.ssl) portString = "443";
        } else if (this.port === 80) {
            if (this.ssl) portString = "80";
        } else if (this.port) {
            portString = this.port.toString(PORT_BASE);
        } else {
            Redis.renewRedis(REDIS_PARAMS.general)
                .zincrby(FAILURE_CACHE, 1, "port gen issue " + JSON.stringify(this));
        }
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
        const id = this.getID();
        const host = this.host.getID();
        const path = this.path.getID();
        const query = this.query.getID();
        return [id, this.ssl, host, this.port, path, query];
    }
    table(): string {
        return "ResourceURL";
    }
    getDeps() {
        return [this.host, this.path, this.query];
    }
    writeVersion(
        version: number,
        format: FileFormat,
        input: string | Buffer | NodeJS.ReadableStream
    ) {
        const id = this.getID();
        // Wait 15 seconds before attempting to compress the outer dir.
        Redis.renewRedis(REDIS_PARAMS.fileLock).setex(id.toString(), 15);
        log("Writing", FileFormat[format]);

        return write(Entity.RESOURCE, id, version, format, input);
    }
    isFetchLocked() {
        return Redis.renewRedis(REDIS_PARAMS.fetchLock).eq(this.toURL());
    }
    setFetchLock() {
        Redis.renewRedis(REDIS_PARAMS.fetchLock).setex(this.toURL());
    }
    static async popForFetching(host: string) {
        const url = await Redis.renewRedis(REDIS_PARAMS.fetchSchedule).zpopmax(host, 1);
        if (url) new ResourceURL(url).setFetchLock();

        return new ResourceURL(url);
    }
    static async popForProcessing() {
        const url = await Redis.renewRedis(REDIS_PARAMS.general).spop("html");
        if (!url) return null;

        return new ResourceURL(url);
    }
}
