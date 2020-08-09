import path from "path"
import fs from "fs"
import { JSDOM } from "jsdom"
import { getRepresentations } from "services/resource-processor/ExtractMLRepresentations";
import { BagOfWords } from "types/ml/BagOfWords";

/*
test("get bag of words works", () => {
    const file = path.join(__dirname, "html/0001.html");
    const content = fs.readFileSync(file);
    const url = "https://en.wikipedia.org/wiki/Newspaper_circulation";
    const dom = new JSDOM(content, { url });

    const { bagOfWords: bow } = getRepresentations(dom);
    const buffer = bow.toBuffer();
    const bow2 = new BagOfWords().fromBuffer(buffer);
    expect(bow2.bag).toStrictEqual(bow.bag);
});
test("get bag of words weird bug", () => {
    const file = path.join(__dirname, "html/0004.html");
    const content = fs.readFileSync(file);
    const url = "https://en.wikipedia.org/wiki/Wesley_R._Elsberry";
    const dom = new JSDOM(content, { url });

    const bow = getRepresentations(dom);
    console.log(bow.toString());
});

*/