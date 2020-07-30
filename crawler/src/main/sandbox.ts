/*
import { entityIDs, allVersions, read } from "./file";
import { Entity } from "./types/Entity";
import { FileFormat } from "./types/FileFormat";
import { JSDOM } from "jsdom";
import { process as extractHits } from "./resource-processor/extract-hits";

entityIDs(Entity.RESOURCE).then(async ids => {
    for (const id of ids) {
        const versionList = await allVersions(Entity.RESOURCE, id);
        const versions = new Map<number, FileFormat[]>();
        for (const [timestamp, format] of versionList) {
            let forTimestamp: FileFormat[];
            if (versions.has(timestamp))
                forTimestamp = versions.get(timestamp);
            else {
                forTimestamp = [];
                versions.set(timestamp, forTimestamp);
            }
            forTimestamp.push(format);
        }
        new Promise(async res => {
            for (const version of versions.keys()) {
                const formats = versions.get(version);
                if (FileFormat.HITS in formats) {
                    console.log(id, "has hits");
                } else {
                    const content = await read(Entity.RESOURCE, id, version, FileFormat.RAW_HTML);
                    const window = new JSDOM(content).window;
                    const promises = extractHits(window, null, version, id);
                    await Promise.all(promises);
                }
            }
            res();
        });
    }
});

*/

import { selectPreSchedule } from "./data";

selectPreSchedule()
    .then(resources => console.log(resources));
