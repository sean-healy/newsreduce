import { LevenshteinAlgo } from "utils/LevenshteinAlgo"
import { DamerauLevenshteinAlgo } from "utils/DamerauLevenshteinAlgo"

test("Levenshtein works", () => {
    const algo = new DamerauLevenshteinAlgo("reporter-herald".split(""), "www.mediawiki.org".split(""));
    algo.calculate();
    console.log(algo.toString());
})