import { Resource } from "../types/Resource";

const URL_ENCODING = "utf8";
const PORT_BASE = 10;
export function generateURL(resource: Resource) {
    const ssl = resource.ssl;
    const protocol = ssl ? "https://" : "http://";
    let length = protocol.length;
    const port = resource.port;
    let portString: string;
    if (port === 443) {
        if (!ssl) {
            length += 4;
            portString = "443";
        } else {
            portString = null;
        }
    } else if (port === 80) {
        portString = null;
    } else {
        portString = port.toString(PORT_BASE);
        length += 1 + portString.length;
    }
    const host = resource.host;
    length += Buffer.byteLength(host, URL_ENCODING);
    const path = resource.path;
    if (path) length += Buffer.byteLength(path, URL_ENCODING);
    const query = resource.query;
    if (query) length += 1 + Buffer.byteLength(query, URL_ENCODING);
    const url = Buffer.alloc(length);
    let i = 0;
    i += url.write(protocol, i, URL_ENCODING);
    i += url.write(host, i, URL_ENCODING)
    if (portString) {
        i += url.write(":", i, URL_ENCODING);
        i += url.write(portString, i, URL_ENCODING);
    }
    if (path) i += url.write(path, i, URL_ENCODING);
    if (query) {
        i += url.write("?", i, URL_ENCODING);
        i += url.write(query, i, URL_ENCODING);
    }
    return url.toString(URL_ENCODING);
}

export function parseURL(url: string) {
    const groups = url.match(/^http(s)?:\/\/([^\/:?#]+)(:\d+)?(\/[^?#]*)?(\?[^#]*)?(#.*)?$/);
    if (!groups) return null;
    const ssl = !!groups[1];
    const host = groups[2];
    return {
        ssl,
        host,
        port: groups[3] ? parseInt(groups[3].substr(1)) : ssl ? 443 : 80,
        path: groups[4] ? groups[4] : "",
        query: groups[5] ? groups[5].substr(1) : "",
    };
}
