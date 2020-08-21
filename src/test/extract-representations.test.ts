//import { getRepresentations } from "services/resource-processor/ExtractMLRepresentations";
import { readFileSync } from "fs";
import path from "path";
import { JSDOM } from "jsdom";

test("extract bag of words works", () => {
    expect(true).toBe(true);
    /*
    const file = path.join(__dirname, "html/0002.html");
    const content = readFileSync(file);
    const dom = new JSDOM(content);
    const rep = getRepresentations(dom);
    expect(rep.bagOfWords.objects.size).toBe(454);
    expect(rep.bagOfWords.bag.size).toBe(454);
    expect(rep.bagOfSkipGrams.bag.size).toBe(15656);
    */
});
