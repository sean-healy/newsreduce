import path from "path";
import fs from "fs";
import { ExtractTokens2 } from "services/resource-processor/ExtractTokens2";

test("second token round should work as intended", async () => {
    const file = path.join(__dirname, "tokens/0001.txt");
    const content = fs.readFileSync(file);
    const text = await ExtractTokens2.normaliseBufferText(content);
    console.log(text);
})