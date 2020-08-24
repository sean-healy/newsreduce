import { Sequence } from "./Sequence";
import { EditDistance } from "./EditDistance";
import { SequenceItem } from "./SequenceItem";

// https://en.wikipedia.org/wiki/Levenshtein_distance
export class LevenshteinAlgo<P extends SequenceItem, S extends Sequence<P>> extends EditDistance<P, S> {
    constructor(
        X: S extends string[] ? (string | S) : S,
        Y: S extends string[] ? (string | S) : S,
        insertionCost = 1,
        deletionCost = 1,
        substitutionCost = 2,
    ) {
        super(X, Y, 1, insertionCost, deletionCost, substitutionCost);
    }
    calculate() {
        const {
            matrix, X, Y, N, M,
            insertionCost, deletionCost, substitutionCost,
        } = this;
        function D(i: number, j: number) {
            if (matrix[i][j]) return matrix[i][j];
            let d: number;
            if (i * j === 0) d = Math.max(i, j);
            else {
                const insertion = D(i, j - 1) + insertionCost;
                const deletion = D(i - 1, j) + deletionCost;
                const substitution = D(i - 1, j - 1) + (X[i - 1] === Y[j - 1] ? 0 : substitutionCost);
                d = Math.min(insertion, deletion, substitution);
            }
            matrix[i][j] = d;

            return d;
        }
        for (let i = 0; i <= N; ++i)
            for (let j = 0; j <= M; ++j)
                D(i, j);
    }
}