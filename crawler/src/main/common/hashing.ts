import crypto from "crypto";

export function checksum(content: crypto.BinaryLike) {
    return crypto.createHash("sha384").update(content).digest().toString("base64");
}

export function defaultHash(prefix: string, str: crypto.BinaryLike) {
    return crypto.createHash("sha3-256").update(`${prefix}:${str.toString()}`).digest().slice(0, 12);
}
