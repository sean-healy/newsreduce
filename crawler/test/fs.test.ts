import { deleteIfChecksumMatches } from "../src/common/fs";
import { checksum } from "../src/common/hashing";
import * as fs from "fs";
import * as crypto from "crypto";

const path = `/tmp/${crypto.randomBytes(30).toString("hex")}`;
fs.writeFileSync(path, "Hello world!");
//deleteIfChecksumMatches(path, expectedChecksum);

test("delete if checksum match works", async () => {
    deleteIfChecksumMatches(path, checksum("Hello world!"));
    expect(fs.existsSync(path)).toBe(false);
});
