import "./setup.ts";
import { compress, SAFETY_PERIOD_MS } from "services/compressor/functions";
import { write, findVersions, readLatestVersion } from "file";
import path from "path"
import fs from "fs";
import { Entity } from "types/Entity";
import { ResourceVersionType } from "types/objects/ResourceVersionType";
import { sleep, spawnPromise } from "common/util";
import { spawn } from "child_process";

test("compress should work", async () => {
    jest.setTimeout(6000);
    const tzst = "/var/newsreduce/test/blobs/resource/123.tzst";
    if (fs.existsSync(tzst)) fs.unlinkSync(tzst);

    const html = "Hello world!"
    const header = "Content-Type: null";
    let htmlBytes =
        await write(Entity.RESOURCE, BigInt(123), 456, ResourceVersionType.RAW_HTML, html);
    let headerBytes =
        await write(Entity.RESOURCE, BigInt(123), 456, ResourceVersionType.RAW_HEADERS, header);

    // since the file version hasn't been written before, it should return bytes written.
    expect(htmlBytes).toBe(html.length);
    expect(headerBytes).toBe(header.length);
    const script = path.join(__dirname, "../main/bash/pull-remote-files.sh");
    await spawnPromise(() => spawn(script, { env: process.env }));
    await sleep(SAFETY_PERIOD_MS);
    await compress();
    htmlBytes =
        await write(Entity.RESOURCE, BigInt(123), 456, ResourceVersionType.RAW_HTML, html);
    headerBytes =
        await write(Entity.RESOURCE, BigInt(123), 456, ResourceVersionType.RAW_HEADERS, header);

    // if a file version is already in the archive, bytes written should be -1.
    expect(htmlBytes).toBe(-1);
    expect(headerBytes).toBe(-1);
    expect(fs.existsSync(tzst)).toBe(true);
    const versions = await findVersions(Entity.RESOURCE, BigInt(123));
    expect(versions).toStrictEqual([
        [456, ResourceVersionType.RAW_HEADERS],
        [456, ResourceVersionType.RAW_HTML],
    ]);

    // ensure we can actually read the content written to the archive.
    const htmlContent =
        await readLatestVersion(Entity.RESOURCE, BigInt(123), ResourceVersionType.RAW_HTML);
    const headerContent =
        await readLatestVersion(Entity.RESOURCE, BigInt(123), ResourceVersionType.RAW_HEADERS);
    expect(htmlContent.toString()).toBe(html);
    expect(headerContent.toString()).toBe(header);

    fs.unlinkSync(tzst);
});
