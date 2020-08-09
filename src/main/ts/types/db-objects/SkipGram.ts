import { bitCount } from "common/util";
import { SimpleHashObject } from "./SimpleHashObject";

export class SkipGram extends SimpleHashObject<SkipGram> {
    table(): string {
        return "SkipGram";
    }

    // N --> skips --> windows
    static SKIP_GRAM_WINDOWS: Map<number, Map<number, number[][]>>;
    static getSkipWindows(n: number, skips: number) {
        if (!SkipGram.SKIP_GRAM_WINDOWS)
            SkipGram.SKIP_GRAM_WINDOWS = new Map<number, Map<number, number[][]>>();
        let windowsForN: Map<number, number[][]>;
        if (SkipGram.SKIP_GRAM_WINDOWS.has(n))
            windowsForN = SkipGram.SKIP_GRAM_WINDOWS.get(n);
        else {
            windowsForN = new Map<number, number[][]>();
            SkipGram.SKIP_GRAM_WINDOWS.set(n, windowsForN);
        }
        let windowsForSkips: number[][];
        if (windowsForN.has(skips))
            windowsForSkips = windowsForN.get(skips);
        else {
            windowsForSkips = [];
            windowsForN.set(skips, windowsForSkips);
            const start = (1 << n) - 1;
            const end = ((start >> 1) << skips + 1) | 1;
            for (let i = start; i <= end; i += 2)
                if (bitCount(i) === n) {
                    let indexMask = new Array<number>(n - 1);
                    for (let j = 1, k = 0, mask = i >> 1; mask; mask >>= 1, ++j)
                        if (mask & 1)
                            indexMask[k++] = j;
                    windowsForSkips.push(indexMask);
                }
        }

        return windowsForSkips;
    }
}
