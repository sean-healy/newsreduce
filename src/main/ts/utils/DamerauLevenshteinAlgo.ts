import { Sequence } from "./Sequence";
import { EditDistance } from "./EditDistance";
import { SequenceItem } from "./SequenceItem";

// https://en.wikipedia.org/wiki/Damerau%E2%80%93Levenshtein_distance
export class DamerauLevenshteinAlgo<P extends SequenceItem, S extends Sequence<P>> extends EditDistance<P, S> {
    private readonly da: Map<P, number>;
    constructor(
        X: S extends string[] ? (string | S) : S,
        Y: S extends string[] ? (string | S) : S,
        insertionCost = 1,
        deletionCost = 1,
        substitutionCost = 2,
    ) {
        super(X, Y, 2, insertionCost, deletionCost, substitutionCost);
        const da = new Map<P, number>();
        for (const p of this.X.concat(this.Y))
            da.set(p, 1);
        this.da = da;
    }
    calculate() {
        const maxdist = this.N + this.M;
        const {
            matrix: d,
            X, Y, N, M, da,
            insertionCost,
            deletionCost,
            substitutionCost,
        } = this;
        d[0][0] = maxdist;
        // Left
        for (let i = 1; i < N + 2; ++i) {
            d[i][0] = maxdist;
            d[i][1] = i - 1;
        }
        // Top
        for (let i = 1; i < M + 2; ++i) {
            d[0][i] = maxdist;
            d[1][i] = i - 1;
        }

        for (let i = 2; i < N + 2; ++i) {
            let db = 1;
            for (let j = 2; j < M + 2; ++j) {
                const k = da.get(Y[j - 2]);
                const l = db;
                let cost: number;
                if (X[i - 2] === Y[j - 2]) {
                    cost = 0;
                    db = j;
                } else cost = substitutionCost;
                const insertion = d[i][j - 1] + insertionCost;
                const deletion = d[i - 1][j] + deletionCost;
                const substitution = d[i - 1][j - 1] + cost;
                const transposition = d[k - 1][l - 1] + (i - k - 1) + 1 + (j - l - 1);
                const min = Math.min(insertion, deletion, substitution, transposition);
                /*console.log({
                    min,
                    substitution,
                    insertion,
                    deletion,
                    transposition,
                    cost,
                    iV: i < d.length,
                    jV: j < d[0].length,
                    k,
                    l
                });*/
                d[i][j] = min;
            }
            da.set(X[i - 2], i);
        }
    }
}