import readline from "readline";
import fs from "fs";

test("readline works as intended", async () => {
    const file = "/tmp/readline";
    fs.writeFileSync(file, "a\nb\nc");
    const readInterface = readline.createInterface({
        input: fs.createReadStream(file)
    });
    const lines = [];
    readInterface.on("line", line => lines.push(line));
    await new Promise(res => readInterface.on("close", res));
    expect(lines).toStrictEqual(["a", "b", "c"]);
    fs.unlinkSync(file);
});
