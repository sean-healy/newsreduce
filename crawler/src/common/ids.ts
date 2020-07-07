import { parseURL, generateURL } from "./url";
import { defaultHash } from "./hashing";

export function getUrlID(url: string) {
    const resource = parseURL(url);
    if (!resource) return null;
    url = generateURL(resource);
    const idBytes = defaultHash("resource", url);
    const id = idBytes.readBigUInt64BE();
    return { id, idBytes };
}

export function getWordID(word: string) {
    const idBytes = defaultHash("word", word);
    const id = idBytes.readBigUInt64BE();
    return { id, idBytes };
}

export function getHostID(hostname: string) {
    const idBytes = defaultHash("host", hostname);
    const id = idBytes.readBigUInt64BE();
    return { id, idBytes };
}

export function getPathID(path: string) {
    const idBytes = defaultHash("resource-path", path);
    const id = idBytes.readBigUInt64BE();
    return { id, idBytes };
}
export function getQueryID(path: string) {
    const idBytes = defaultHash("resource-query", path);
    const id = idBytes.readBigUInt64BE();
    return { id, idBytes };
}
