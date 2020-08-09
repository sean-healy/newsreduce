import fs from "fs";
import { JSDOM } from "jsdom";
import { SQL } from "common/SQL";
import { Dictionary } from "common/util";
import { ResourceID, ResourceURL } from "types/db-objects/ResourceURL"; import { VersionType } from "types/db-objects/VersionType";
import { Key } from "types/db-objects/Key";
import { Redis } from "common/Redis";
import { BagOfSkipGrams } from "types/ml/BagOfSkipGrams";
import { SkipGrams } from "types/ml/SkipGrams";
import { entityIDs } from "file";
import { Entity } from "types/Entity";
import { getRepresentations } from "services/resource-processor/ExtractMLRepresentations";
import { SkipGram } from "types/db-objects/SkipGram";
import { Word } from "types/db-objects/Word";

// WIP
export function main() {
    const content = fs.readFileSync("/tmp/raw.html");
    const dom = new JSDOM(content);
    const body = dom.window.document.body;
    const stack: [number, Element][] = [];
    stack.push([0, body]);
    while (stack.length) {
        const [depth, element] = stack.pop();
        for (let i = 0; i < depth; ++i)
            process.stdout.write(" ");
        console.log(depth, element.tagName);
        const children = element.children;
        const length = children.length;
        for (let i = 0; i < length; ++i) {
            const child = children.item(i);
            stack.push([depth + 1, child]);
        }
    }
}

export async function main2() {
    const vType = VersionType.ANCHOR_PATHS;
    const key = Key.WIKI_NEWS_SOURCE_HOMEPAGE;
    const sql =
        `select rv.resource, rv.time, rkv.value label from ResourceVersion rv inner join ResourceKeyValue rkv on rkv.resource = rv.resource where rv.type = ? and rkv.\`key\` = ?;`
    const rows = (await SQL.query<Dictionary<any>[]>(sql, [vType.getID(), key.getID()])).map(row => [BigInt(row.resource), row.time, row.label]);
    const n = 3;
    let positives = 0;
    let positivesAndNegatives = 0;
    const positive = new BagOfSkipGrams();
    const negative = new BagOfSkipGrams();
    const all = new BagOfSkipGrams();
    for (const [id, time, label] of rows) {
        const buffer = await new ResourceID(id).read(time, vType);
        if (buffer) {
            const urlRows = buffer.toString().split("\n");
            for (const urlRow of urlRows) {
                const [url, path] = urlRow.split("\t");
                const host = new ResourceURL(url).host.name;
                const polarity = label === host;
                if (polarity) ++positives;
                ++positivesAndNegatives;
                const skipGrams = SkipGrams.generateSkipGramsForDocument(path, 3, 4, true);
                for (const [id, count] of skipGrams.bag) {
                    if (polarity) positive.registerID(id, count);
                    else negative.registerID(id, count);
                    all.registerID(id, count);
                }
            }
        }
        break;
    }
    const pCategory = positives / positivesAndNegatives;
    const positiveFrequencies = positive.toFrequenciesBag();
    const negativeFrequencies = negative.toFrequenciesBag();
    const allFrequencies = all.toFrequenciesBag();
    const igPerSkipGram = [];
    for (const [skipGram, aposteriori] of positive.bag) {
        const apriori = all.bag.get(skipGram)
        const ig = aposteriori - apriori;
        igPerSkipGram.push([skipGram, ig]);
    }
    igPerSkipGram.sort((a, b) => b[1] - a[1]);
    console.log(igPerSkipGram);
    console.log(pCategory);
    await Redis.quit();
    (await SQL.db()).destroy();
}

export async function main3() {
    const q = `select resource from ResourceVersion where type in (select id from VersionType where filename = "tokens.txt");`
    const rows = await SQL.query<any[]>(q);
    const set = new Set<bigint>();
    let doc = 0;
    console.log("Rows:", rows.length);
    for (const row of rows) {
        const resource = BigInt(row.resource);
        const buffer = await new ResourceID(resource).readLatest(VersionType.TOKENS_TXT);
        if (buffer) {
            const rep = getRepresentations(buffer.toString());
            for (const [key, val] of rep.bagOfSkipGrams.objects) {
                set.add(key);
            }
        }
        console.log("NGrams:", set.size, "Docs:", doc++);
    }
}

export async function investigateSkipGrams() {
    for (let n = 1; n < 10; ++n) {
        for (let skips = 0; skips < 10; ++skips) {
            const size = SkipGram.getSkipWindows(n, skips).length;
            console.log([n, skips, size].map(s => s.toString()).join(","));
        }
    }
}

export async function trainBayes() {
    const sql = "select * from "
}

//main3();
//trainBayes();
console.log(new Word("france").getID());