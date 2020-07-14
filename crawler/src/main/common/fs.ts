import fs from "fs";
import { checksum } from "./hashing";
import { log } from "./logging";

export function deleteIfChecksumMatches(path: string, expectedChecksum: string) {
    const exists = fs.existsSync(path);
    if (exists) {
        const content = fs.readFileSync(path);
        const actualChecksum = checksum(content).toString();
        if (expectedChecksum === actualChecksum)
            fs.unlinkSync(path);
        else
            log(`attempted to delete ${path}, but checksum ${actualChecksum} did not match ${expectedChecksum}`);
    }
}
