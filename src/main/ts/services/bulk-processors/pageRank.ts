import { selectBacklinks } from "data";
import { Redis } from "common/Redis";
import { SQL } from "common/SQL";
import { bytesNeeded, fancyLog, CMP_INT } from "common/util";
import { LocalLinksData, PageData } from "types/LocalLinksFile";
import { spawn } from "child_process";
import fs from "fs";
import { ResourceRankByID } from "types/db-objects/ResourceRank";
import { PromisePool } from "common/PromisePool";

const PAGE_RANK_CMD = "page-rank";

let nextLocalID = 0;
const resourceIndex = new Map<bigint, number>();
function generateLocalID(uuid: bigint) {
    let localID: number = resourceIndex.get(uuid);
    if (localID === undefined) {
        localID = nextLocalID++;
        resourceIndex.set(uuid, localID);
    }

    return localID;
}

export async function main() {
    const uLinks = new Map<bigint, bigint[]>()
    const lLinks = new Map<number, number[]>()
    fancyLog("Retrieving data from SQL.");
    let pairs = await selectBacklinks();
    fancyLog(pairs.length + " links retrieved.");
    for (const [parent, child] of pairs)
        if (parent !== child) {
            let pageLinks = uLinks.get(parent);
            if (pageLinks) pageLinks.push(child);
            else uLinks.set(parent, [child]);
        }
    pairs = [];
    fancyLog("Links mapped.");
    let fewerNodes: boolean;
    let round = 0;
    do {
        console.log("Remove dead ends (round):", round++);
        fewerNodes = false;
        for (const [parent, children] of uLinks) {
            let nextCount = 0;
            for (const child of children) if (uLinks.has(child)) ++nextCount;
            if (nextCount === 0) {
                uLinks.delete(parent);
                fewerNodes = true;
            } else if (nextCount < children.length) {
                const nextChildren = new Array<bigint>(nextCount);
                let i = 0;
                for (const child of children)
                    if (uLinks.has(child))
                        nextChildren[i++] = child;
                uLinks.set(parent, nextChildren);
            }
        }
    } while (fewerNodes);
    let maxLinksPerPage = 0;
    for (const [parent, children] of uLinks) {
        const lParent = generateLocalID(parent);
        const lChildren = children.map(generateLocalID).sort(CMP_INT);
        lLinks.set(lParent, lChildren);
        maxLinksPerPage = Math.max(maxLinksPerPage, lChildren.length);
    }
    fancyLog("Local index created.");
    const localIDs = nextLocalID;
    const reverseIndex = new Array<bigint>(localIDs);
    for (const [u, l] of resourceIndex) reverseIndex[l] = u;
    const localLinks = new Array<PageData>(lLinks.size);
    let i = 0;
    const parents = [...lLinks.keys()].sort(CMP_INT);
    for (const parent of parents) {
        const pageLinks = lLinks.get(parent);
        if (pageLinks)
            localLinks[i++] = [parent, pageLinks];
    }
    const idBytes = bytesNeeded(localIDs);
    const linkCountBytes= bytesNeeded(maxLinksPerPage);
    const escapeHatch = 0;
    const localLinksData = new LocalLinksData({
        idBytes,
        linkCountBytes,
        escapeHatch,
        data: localLinks,
    })
    const file = localLinksData.write();
    fancyLog("Wrote links to file.");
    const params: string[] = [idBytes.toString(), linkCountBytes.toString(), localIDs.toString(), file];
    console.log(PAGE_RANK_CMD, params);
    const process = spawn(PAGE_RANK_CMD, params);
    let allData = Buffer.alloc(0);
    process.stdout.on("data", data => allData = Buffer.concat([allData, data]));
    await new Promise(res => process.on("close", res));
    const length = reverseIndex.length;
    const promises = new Array<Promise<void>>(length);
    for (let i = 0; i < length; ++i) {
        const rank = allData.slice(i << 3, (i + 1) << 3).readDoubleLE();
        promises[i] = new ResourceRankByID(reverseIndex[i], rank).enqueueInsert({ recursive: true });
    }
    console.log("Enqueued new page ranks.");
    await Promise.all(promises);
    fs.unlinkSync(file);
    (await SQL.db()).destroy();
    await Redis.quit();
}

main();