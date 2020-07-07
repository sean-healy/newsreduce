import crypto from "crypto";

export function checksum(content: crypto.BinaryLike) {
    return crypto.createHash("sha384").update(content).digest().toString("base64");
}

export function defaultHash(prefix: string, str: crypto.BinaryLike) {
    return crypto.createHash("sha3-256").update(`${prefix}:${str.toString()}`).digest().slice(0, 12);
}

export function integerToBytesReversed(n: number) {
    const l = new Array(Math.ceil(Math.log(n) / Math.log(256)))
    let i = 0;
    while (n) {
        l[i++] = n % 256;
        n = Math.floor(n / 256);
    }
    return l
}
