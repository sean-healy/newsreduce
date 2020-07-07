export const CMP_BIG_INT = (a: bigint, b: bigint) => a < b ? -1 : a > b ? 1 : 0;

export async function setImmediateInterval(f: () => void, ms: number) {
    setImmediate(f);
    return setInterval(f, ms);
}

const ZERO = BigInt(0);
const EIGHT = BigInt(8);

export function bytesToBigInt(bytes: Buffer) {
    let result = ZERO;
    for (const byte of bytes)
        result = (result << EIGHT) | BigInt(byte);

    return result;
}
