import crypto from "crypto";
import { ipv6ToID, ipv4ToID } from "./ip";

export function defaultHash(str: string, length: number = 30) {
    return crypto.createHash("sha3-256").update(str).digest().slice(0, length);
}

export function safeHashResource(url: string) {
    return defaultHash(url);
}

export function safeHashResourceForTime(url: string, time: number) {
    const buf = safeHashResource(url);
    const bufLength = buf.length;
    const timeBytes = integerToBytesReversed(time);
    const timeBytesLength = timeBytes.length;
    for (let i = 0; i < timeBytesLength; ++i)
        buf[bufLength - i - 1] = timeBytes[i];

    return buf;
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
