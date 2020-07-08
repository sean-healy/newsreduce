import { compress } from "services/compressor/functions";
import { safeMkdir } from "file";
import fs from "fs";
import path from "path";

test("selecting items to schedule should work", async () => {
    const tmpDir = "/var/newsreduce/test/tmp";
    const tmpDirForVersion = "/var/newsreduce/test/tmp/resource/123/456";
    const blobsDir = "/var/newsreduce/test/blobs/resource";

    await safeMkdir(tmpDirForVersion);
    await safeMkdir(blobsDir);
    const file = path.join(tmpDirForVersion, "hello.txt");

    fs.writeFileSync(file, "Hello world!");
    await compress(tmpDir);
    const tzst = "/var/newsreduce/test/blobs/resource/123.tzst";
    expect(fs.existsSync(tzst)).toBe(true);
    fs.unlinkSync(tzst);
    fs.unlinkSync(file);
});
