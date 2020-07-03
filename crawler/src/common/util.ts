export const CMP_BIG_INT = (a: bigint, b: bigint) => a < b ? -1 : a > b ? 1 : 0;

export async function setImmediateInterval(f: () => void, ms: number) {
    setImmediate(f);
    return setInterval(f, ms);
}
