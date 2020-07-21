import { ResourceURL } from "types/objects/ResourceURL";
import { ResourceURLQuery } from "types/objects/ResourceURLQuery";

test("asCSV works", () => {
    const url = new ResourceURL("https://example.org/foo?bar");
    let csvRow = url.asCSVRow();
    let expected = "\"17870448408277220596797525334\",\"1\",\"30381011219481922423671636787\",\"443\",\"8726082972358178231392810827\",\"13520453222346162044670265619\"";
    expect(csvRow).toBe(expected);
    const query = new ResourceURLQuery('q="sean,healy"');
    csvRow = query.asCSVRow();
    expected = '"42088580794127110136470471624","q=\\"sean,healy\\""';
    expect(csvRow).toBe(expected);
});
