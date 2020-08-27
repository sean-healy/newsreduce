import { Sequence } from "./Sequence";
import { SequenceItem } from "./SequenceItem";

/**
 * Constructed with two strings, and encapsulates the memory allocated thereafer
 * for dynamic programming.
 * 
 * Encapsulating this may seem over the top, but it's useful for logging and debugging
 * solution matrices, partial solutions, and so on.
 * 
 * For example, the {@link EditDistance#toString} method pretty-prints the dynamic
 * programming matrix, with characters along the horizontal and vertical axes.
 * 
 * Subclasses should always allocated memory in the constructor, use the memory in
 * the {@link EditDistance#calculate} method, and finally access the solution using
 * {@link EditDistance#distance}.
 * 
 * https://en.wikipedia.org/wiki/Edit_distance
 */
export abstract class EditDistance<P extends SequenceItem, S extends Sequence<P>> {
    protected readonly N: number;
    protected readonly M: number;
    protected readonly X: S;
    protected readonly Y: S;
    protected readonly matrix: number[][];
    protected readonly insertionCost: number;
    protected readonly deletionCost: number;
    protected readonly substitutionCost: number;
    protected constructor(
        X: S extends string[] ? (string | S) : S,
        Y: S extends string[] ? (string | S) : S,
        matrixSizeOffset: number,
        insertionCost = 1,
        deletionCost = 1,
        substitutionCost = 2,

    ) {
        const N = X.length;
        const M = Y.length;
        if (typeof X === "string") this.X = X.split("") as S;
        else this.X = X as S;
        if (typeof Y === "string") this.Y = Y.split("") as S;
        else this.Y = Y as S;
        this.N = N;
        this.M = M;
        this.insertionCost = insertionCost;
        this.deletionCost = deletionCost;
        this.substitutionCost = substitutionCost;
        const rows = N + matrixSizeOffset;
        const matrix = new Array<number[]>(rows);
        for (let i = 0; i < rows; ++i)
            matrix[i] = new Array<number>(M + matrixSizeOffset);
        this.matrix = matrix;
    }
    abstract calculate(): void;
    distance() {
        const distance = this.matrix[this.N][this.M];
        if (distance === undefined)
            throw new Error("Must calculate solution via StringMetric.calculate() before requesting distance.");

        return distance;
    }
    similarityCoefficient() {
        return 1 / (this.distance() + 1);
    }
    toString() {
        const matrixSizeOffset = this.matrix.length - this.N;
        let sBuilder = [];
        sBuilder.push("   ");
        for (let i = 0; i < matrixSizeOffset; ++i) sBuilder.push("   ");
        for (let i = 0; i < this.M; ++i) {
            const part = this.Y[i];
            sBuilder.push(`${part}`)
            sBuilder.push("  ");
        }
        sBuilder.push("\n");
        for (let i = 0; i < this.matrix.length; ++i) {
            if (i >= matrixSizeOffset) sBuilder.push(this.X[i - matrixSizeOffset])
            else sBuilder.push(" ")
            sBuilder.push(" ")
            for (let n of this.matrix[i]) {
                n = n || 0;
                if (n < 10) sBuilder.push(" ");
                sBuilder.push(n.toString());
                sBuilder.push(" ");
            }
            sBuilder.push("\n");
        }
        sBuilder.pop();

        return sBuilder.join("");
    }
}