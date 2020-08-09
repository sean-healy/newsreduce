import { ChildProcessWithoutNullStreams } from "child_process";

export const CMP_BIG_INT = (a: bigint, b: bigint) => a < b ? -1 : a > b ? 1 : 0;
export const CMP_INT = (a: number, b: number) => a - b;

export function setImmediateInterval(f: () => void, ms: number): NodeJS.Timeout {
    setImmediate(f);
    return setInterval(f, ms) as any as NodeJS.Timeout;
}

export const STR_ONE = "1";
export const BIGINT_ZERO = BigInt(0);
export const BIGINT_EIGHT = BigInt(8);
export const BIGINT_MASK = BigInt(0xFF);

export function bytesToBigInt(bytes: Buffer) {
    if (!bytes) return bytes as (null | undefined);
    let result = BIGINT_ZERO;
    for (const byte of bytes)
        result = (result << BIGINT_EIGHT) | BigInt(byte);

    return result;
}

export function bytesToNumber(bytes: Buffer) {
    if (!bytes) return bytes as (null | undefined);
    let result = 0;
    for (const byte of bytes) {
        result = (result * 256) + byte;
    }

    return result;
}

export function writeBigUInt96BE(n: bigint, buffer: Buffer = Buffer.alloc(12), offset: number = 0) {
    writeAnyNumberBE(n, 12, buffer, offset);

    return buffer;
}
export function writeAnyNumberBE(
    n: number | bigint,
    bytes: number,
    buffer: Buffer = Buffer.alloc(bytes),
    offset: number = 0,
) {
    let bigintN = BigInt(n);
    for (let i = 0; i < bytes; ++i) {
        const byte = (bigintN & BIGINT_MASK);
        buffer[offset + bytes - 1 - i] = Number(byte);
        bigintN >>= BIGINT_EIGHT;
    }

    return buffer;
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
    "Module.<anonymous>",
    "Object.<anonymous>",
    "RedisClient.<anonymous>",
    "__webpack_require__",
    "functions_process",
    "processTicksAndRejections",
    "repl",
    "runMicrotasks",
];

export function fancyLog(what: string) {
    const when = new Date().toISOString().split("T", 2)[1];
    const stack = new Error().stack.match(/    at ([^ :]+)/g).map(row => row.replace("    at ", ""))
    const hi = Math.min(...IGNORE_AFTER.map(name => stack.indexOf(name)).filter(index => index >= 0));

    const where = stack.slice(1, hi).join("() > ");

    console.log(`${ESC}[97m${when} : ${ESC}[32m${where}()\n${ESC}[39m${what}`);
}

export const IDENTITY_FUNCTION = <T>(r: T) => r

export async function spawnPromise(spawner: () => ChildProcessWithoutNullStreams) {
    const content = await new Promise<Buffer>((res, rej) => {
        const process = spawner();
        process.on("error", err => rej(err));
        process.stdout.on("error", err => rej(err));
        process.stderr.on("error", err => {
            fancyLog("stderr error");
            fancyLog(JSON.stringify(err));
        });
        const stdout = [];
        const stderr = [];
        process.stdout.on("data", (data: Buffer) => stdout.push(data));
        process.stderr.on("data", (data: Buffer) => stderr.push(data));
        process.on("close", code => {
            if (code === 0) {
                const content = Buffer.concat(stdout);
                res(content);
            } else {
                const content = Buffer.concat(stderr);
                rej(content);
            }
        });
    });

    return content;
}

export function sleep(ms: number) {
    return new Promise<void>(res => {
        setTimeout(res, ms);
    });
}

export function bitCount(n: number) {
    n = n - ((n >> 1) & 0x55555555)
    n = (n & 0x33333333) + ((n >> 2) & 0x33333333)
    return ((n + (n >> 4) & 0xF0F0F0F) * 0x1010101) >> 24
}

export function removeRightZeros(n: number) {
    while ((n & 1) === 0) n >>= 1;

    return n;
}

export type ConstructorArg0<T> = { [key in keyof T]?: T[key] };
export type Dictionary<T> = { [key: string]: T };
export function bytesNeeded(n: number) {
    let bytes = 0;
    while (n) {
        ++bytes;
        n = (n >> 8);
    }

    return bytes;
}
