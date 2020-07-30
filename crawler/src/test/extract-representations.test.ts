import { getBagOfWords } from "services/html-processor/ExtractRepresentations";
import { readFileSync } from "fs";
import path from "path";
import { JSDOM } from "jsdom";

test("extract bag of words works", () => {
    const file = path.join(__dirname, "html/0002.html");
    const content = readFileSync(file);
    const window = new JSDOM(content).window;
    const bag = getBagOfWords(window);
    expect(bag.objects.size).toBe(455);
    expect(bag.bag.size).toBe(455);
});
