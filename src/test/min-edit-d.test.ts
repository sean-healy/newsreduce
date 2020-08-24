import { LevenshteinAlgo } from "utils/LevenshteinAlgo";
import { Tokenizer } from "ml/Tokenizer";
import { DamerauLevenshteinAlgo } from "utils/DamerauLevenshteinAlgo";

function parseArgs(args: [string, string]) {
    return args.map(Tokenizer.charTranslateString).map(s => s.split("")) as [string[], string[]];
}

test("min edit distance should work as intended", () => {
    //const a = new DemerauLevenshteinDistance(...parseArgs(["The New York Times", "www.yntimes.com"]));
    const a = new LevenshteinAlgo(...parseArgs(["The New York Times", "www.nytimes.com"]));
    a.calculate();
    console.log(a.toString());
    console.log(a.differenceCoefficient());
    const b = new LevenshteinAlgo(...parseArgs(["The New York Times", "www.newyorktimes.com"]));
    b.calculate();
    console.log(b.toString());
    console.log(b.differenceCoefficient());
});