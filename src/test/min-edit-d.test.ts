import { levenshteinDistance } from "common/util";

test("min edit distance should work as intended", () => {
    const distance = levenshteinDistance("The New York Times", "www.nytimes.com");
    const distance2 = levenshteinDistance("sitting", "kitten");
    console.log(distance);
});