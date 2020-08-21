import path from "path";
import fs from "fs";
import { ExtractReducedTokens } from "services/resource-processor/ExtractReducedTokens";

test("second token round should work as intended", async () => {
    const file = path.join(__dirname, "tokens/0001.txt");
    const buffer = fs.readFileSync(file);
    const text = await ExtractReducedTokens.normaliseBufferText({ buffer });
    console.log(text);
})