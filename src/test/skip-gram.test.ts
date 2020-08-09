import { SkipGram } from "types/db-objects/SkipGram"

test("window funct works", () => {
    console.log(SkipGram.getSkipWindows(2, 0));
})