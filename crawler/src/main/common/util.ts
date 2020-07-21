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

export function iteratorToArray<T>(itr: IterableIterator<T>) {
    const arr: T[] = [];
    for (const item of itr) arr.push(item);

    return arr;
}

let currentTableLine = 0;
let maxLineLength = 0;
const ESC = Buffer.of(0o033).toString();
export function tabulate(data: { [key: string]: any }[]) {
    if (currentTableLine === 0) console.clear();
    const keys = Object.keys(data[0]);
    const printData: { [key: string]: string }[] = new Array(data.length + 1);
    printData[0] = {};
    const widths = keys.map(key => key.length);
    for (let i = 0; i < keys.length; ++i) {
        const key = keys[i];
        printData[0][key] = key.toUpperCase();
        for (let j = 0; j < data.length; ++j) {
            const value = `${data[j][key]}`;
            const prevPrintData = printData[j + 1];
            if (prevPrintData) prevPrintData[key] = value;
            else {
                const dictionary = {};
                dictionary[key] = value;
                printData[j + 1] = dictionary;
            }
            const prevWidth = widths[i];
            const nextWidth = value.length;
            if (prevWidth < nextWidth) widths[i] = nextWidth;
        }
    }
    let toWrite = "";
    if (currentTableLine !== 0) {
        const UP = ESC + '[s' + ESC + '[' + currentTableLine + 'A';
        toWrite += UP;
    }
    currentTableLine = 0;
    for (let i = 0; i < printData.length; ++i) {
        const row = printData[i];
        let line = "";
        for (let j = 0; j < keys.length; ++j) {
            const key = keys[j];
            const padLength = widths[j];
            line += `| ${row[key].padEnd(padLength, " ")} `;
        }
        line += '|';
        const length = line.length;
        if (maxLineLength < length) {
            maxLineLength = length;
            toWrite += line;
        } else
            toWrite += line.padEnd(maxLineLength, " ");
        if (i === 0) {
            toWrite += "\n";
            toWrite += line.replace(/[^|]/g, "-").replace(/\|/g, "+").padEnd(maxLineLength, " ");
            ++currentTableLine;
        }
        toWrite += "\n";
        ++currentTableLine;
    }
    process.stdout.write(toWrite);
}

const IGNORE_AFTER = [
    "repl",
    "Module.<anonymous>",
    "Object.<anonymous>",
    "runMicrotasks",
    "processTicksAndRejections"
];

export function fancyLog(what: string) {
    const when = new Date().toISOString().split("T", 2)[1];
    const stack = new Error().stack.match(/    at ([^ :]+)/g).map(row => row.replace("    at ", ""))
    const hi = Math.min(...IGNORE_AFTER.map(name => stack.indexOf(name)).filter(index => index >= 0));

    const where = stack.slice(1, hi).join("() > ");

    console.log(`${ESC}[97m${when} : ${ESC}[32m${where}()\n${ESC}[39m${what}`);
}

export const IDENTITY_FUNCTION = <T>(r: T) => r
