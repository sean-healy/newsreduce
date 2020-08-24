import { writeBacklinksToFile, writeLinkGraphResourcesToFile } from "data";
import { Redis } from "common/Redis";
import { SQL } from "common/SQL";
import { fancyLog } from "utils/alpha";
import { spawn } from "child_process";
import fs from "fs";
import { randomBufferFile } from "file";
import { ResourceRank } from "types/db-objects/ResourceRank";

const PAGE_RANK_CMD = "page-rank";

export async function main() {
    fancyLog("Retrieving data from SQL.");
    const linksFile = randomBufferFile();
    const resourcesFile = randomBufferFile();
    const resourcesFD = fs.openSync(resourcesFile, "w");
    const linksFD = fs.openSync(linksFile, "w");
    fancyLog(`Writing links to file (${linksFile}).`);
    await writeBacklinksToFile(linksFD);
    fancyLog(`Writing resource IDs to file (${resourcesFile}).`);
    const resources = await writeLinkGraphResourcesToFile(resourcesFD);
    fancyLog("Externally running page rank.");
    const csvFile = randomBufferFile();
    const csvWrite = fs.createWriteStream(csvFile);
    const process = spawn(PAGE_RANK_CMD, [resourcesFile, linksFile]);
    process.stdout.pipe(csvWrite);
    await new Promise(res => process.on("close", res));
    fancyLog("Inserting ranks into SQL.");
    await new ResourceRank().bulkInsert(csvFile);
    fancyLog("Cleaning up files.");
    fs.unlinkSync(resourcesFile);
    fs.unlinkSync(linksFile);
    fs.unlinkSync(csvFile);
    fancyLog("Exiting.");
    (await SQL.db()).destroy();
    await Redis.quit();
}

main();