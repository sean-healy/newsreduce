import { BagOfWords } from "ml/bags/BagOfWords";
import { BinaryBag } from "ml/bags/BinaryBag";

test("bag of words works as expected", () => {
    const bag = new BagOfWords();
    bag.register("seán");
    bag.register("plays");
    bag.register("chess");
    bag.register("chess");

    expect(bag.toString()).toBe(`45271186408820415034461132179 0001
76493640579711076743990118170 0001
77229623075032983850416833437 0002
`);

    const bag2 = new BagOfWords().fromBuffer(bag.toBuffer());
    expect(bag2.toString()).toBe(`45271186408820415034461132179 0001
76493640579711076743990118170 0001
77229623075032983850416833437 0002
`);
});

test("binary bag of words works as expected", () => {
    const bag = BinaryBag.ofWords();
    bag.register("seán");
    bag.register("plays");
    bag.register("chess");
    bag.register("chess");

    expect(bag.toString()).toBe(`45271186408820415034461132179
76493640579711076743990118170
77229623075032983850416833437
`);

    const bag2 = BinaryBag.ofWords().fromBuffer(bag.toBuffer());
    expect(bag2.toString()).toBe(`45271186408820415034461132179
76493640579711076743990118170
77229623075032983850416833437
`);
});
