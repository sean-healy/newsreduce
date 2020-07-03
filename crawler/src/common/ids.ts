import { parseURL, generateURL } from "./url";
import { defaultHash } from "./hashing";

export function getUrlID(url: string) {
    const resource = parseURL(url);
    if (!resource) return null;
    url = generateURL(resource);
    const idBytes = defaultHash(url, 8);
    const id = idBytes.readBigUInt64BE();
    return { id, idBytes };
}

export function getWordID(word: string) {
    const idBytes = defaultHash(word, 8);
    const id = idBytes.readBigUInt64BE();
    return { id, idBytes };
}

export function getHostID(hostname: string) {
    const idBytes = defaultHash(hostname, 8);
    const id = idBytes.readBigUInt64BE();
    return { id, idBytes };
}
