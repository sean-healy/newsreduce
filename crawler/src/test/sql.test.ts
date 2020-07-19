import { ResourceURL } from "types/objects/ResourceURL";
import { ResourceURLQuery } from "types/objects/ResourceURLQuery";

test("asCSV works", () => {
    const url = new ResourceURL("https://example.org/foo?bar");
    let csvRow = url.asCSVRow();
    let expected = '"22054670414319667075856313670","1","38213545475734152910887982345","443","75965650664916694913005348028","14824663750046142854198851882"';
    expect(csvRow).toBe(expected);
    const query = new ResourceURLQuery('q="sean,healy"');
    csvRow = query.asCSVRow();
    expected = '"20564203462238161557503849247","q=\\"sean,healy\\""';
    expect(csvRow).toBe(expected);
});
