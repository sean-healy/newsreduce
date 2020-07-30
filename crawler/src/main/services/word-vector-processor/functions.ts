export function parseWordVector(input: string) {
    if (input === null) throw new Error(`word vector null: ${input}`);
    if (input === undefined) throw new Error(`word vector undefined: ${input}`);
    if (input === "") throw new Error(`word vector empty: ${input}`);
    const tokens = input.split(" ");
    if (tokens.length === 0) throw new Error(`word vector tokens length empty: ${input}`);
    const word = tokens[0];
    if (word === "") throw new Error(`word vector word empty: ${input}`);
}
