import "./setup.ts";
import { compress } from "services/compressor/functions";
import { write, findVersions, readLatestVersion } from "file";
import fs from "fs";
import { Entity } from "types/Entity";
import { FileFormat } from "types/FileFormat";
import { log } from "common/logging";

test("compress should work", async () => {
    const tzst = "/var/newsreduce/test/blobs/resource/123.tzst";
    if (fs.existsSync(tzst)) fs.unlinkSync(tzst);

    const html = "Hello world!"
    const header = "Content-Type: null";
    let htmlBytes = await write(Entity.RESOURCE, BigInt(123), 456, FileFormat.RAW_HTML, html);
    let headerBytes = await write(Entity.RESOURCE, BigInt(123), 456, FileFormat.RAW_HEADERS, header);

    // since the file version hasn't been written before, it should return bytes written.
    expect(htmlBytes).toBe(html.length);
    expect(headerBytes).toBe(header.length);
    await compress();
    htmlBytes = await write(Entity.RESOURCE, BigInt(123), 456, FileFormat.RAW_HTML, html);
    headerBytes = await write(Entity.RESOURCE, BigInt(123), 456, FileFormat.RAW_HEADERS, header);
    log("Wrote bytes:", JSON.stringify({ htmlBytes, headerBytes }));

    // if a file version is already in the archive, bytes written should be -1.
    expect(htmlBytes).toBe(-1);
    expect(headerBytes).toBe(-1);
    expect(fs.existsSync(tzst)).toBe(true);
    const versions = await findVersions(Entity.RESOURCE, BigInt(123));
    expect(versions).toStrictEqual([
        [456, FileFormat.RAW_HTML],
        [456, FileFormat.RAW_HEADERS],
    ]);

    // ensure we can actually read the content written to the archive.
    const htmlContent = await readLatestVersion(Entity.RESOURCE, BigInt(123), FileFormat.RAW_HTML);
    const headerContent = await readLatestVersion(Entity.RESOURCE, BigInt(123), FileFormat.RAW_HEADERS);
    expect(htmlContent.toString()).toBe(html);
    expect(headerContent.toString()).toBe(header);

    fs.unlinkSync(tzst);
});
