import { getBagOfWords } from "services/resource-processor/ExtractRepresentations";
import { readFileSync } from "fs";
import path from "path";
import { JSDOM } from "jsdom";

test("extract bag of words works", () => {
    const file = path.join(__dirname, "html/0002.html");
    const content = readFileSync(file);
    const dom = new JSDOM(content);
    const bag = getBagOfWords(dom);
    expect(bag.objects.size).toBe(455);
    expect(bag.bag.size).toBe(455);
});
