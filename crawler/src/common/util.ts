export const CMP_BIG_INT = (a: bigint, b: bigint) => a < b ? -1 : a > b ? 1 : 0;

export function setImmediateInterval(f: () => void, ms: number) {
    setImmediate(f);
    return setInterval(f, ms);
}

export const STR_ONE = "1";
export const ZERO = BigInt(0);
export const EIGHT = BigInt(8);
export const MASK = BigInt(0xFF);

export function bytesToBigInt(bytes: Buffer): bigint {
    if (!bytes) return bytes as (null | undefined);
    let result = ZERO;
    for (const byte of bytes)
        result = (result << EIGHT) | BigInt(byte);

    return result;
}

export function writeBigUInt96BE(n: bigint, buffer: Buffer, offset: number) {
    for (let i = 0; i <= 11; ++i) {
        const byte = (n & MASK);
        buffer[offset + 11 - i] = Number(byte);
        n >>= EIGHT;
    }
}
