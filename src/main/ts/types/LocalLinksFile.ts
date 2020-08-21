import fs from "fs";
import { randomBufferFile } from "file";
import { writeAnyNumberBE } from "common/util";
import { GenericConstructor } from "./GenericConstructor";

type LocalID = number;
type Links = number[];
export type PageData = [LocalID, Links]

export class LocalLinksData extends GenericConstructor<LocalLinksData> {
    readonly idBytes: number;
    readonly linkCountBytes: number;
    readonly data: PageData[]

    write() {
        const path = randomBufferFile();
        const fd = fs.openSync(path, "w");
        const { idBytes, linkCountBytes, data } = this;
        const idBuffer = Buffer.alloc(idBytes);
        const linkCountBuffer = Buffer.alloc(linkCountBytes);
        for (const [parent, links] of data) {
            writeAnyNumberBE(parent, idBytes, idBuffer);
            fs.writeSync(fd, idBuffer);
            const length = links.length;
            writeAnyNumberBE(length, linkCountBytes, linkCountBuffer);
            fs.writeSync(fd, linkCountBuffer);
            for (const child of links) {
                writeAnyNumberBE(child, idBytes, idBuffer);
                fs.writeSync(fd, idBuffer);
            }
        }
        fs.closeSync(fd);

        return path;
    }
}