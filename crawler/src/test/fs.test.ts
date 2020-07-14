import "./setup.ts";
import { deleteIfChecksumMatches } from "common/fs";
import { checksum } from "common/hashing";
import * as fs from "fs";
import * as crypto from "crypto";

test("delete if checksum match works", async () => {
    const path = `/tmp/${crypto.randomBytes(30).toString("hex")}`;
    fs.writeFileSync(path, "Hello world!");
    deleteIfChecksumMatches(path, checksum("Hello world!"));
    expect(fs.existsSync(path)).toBe(false);
});
