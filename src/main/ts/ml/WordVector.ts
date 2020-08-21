export class Vector {
    readonly vector: number[];
}

export function sum(left: number[], right: number[]) {
    const length = left.length;
    if (length !== right.length) throw new Error("vectors must be the same size for sum(left, right)");
    for (let i = 0; i < length; ++i)
        left[i] += right[i];

    return left;
}
