import fs from "fs";
import sql from "sql";
import { JSDOM } from "jsdom";
import { SQL } from "common/SQL";
import { Dictionary } from "common/util";
import { ResourceID, ResourceURL } from "types/db-objects/ResourceURL";
import { VersionType } from "types/db-objects/VersionType";
import { Key } from "types/db-objects/Key";
import { Redis } from "common/Redis";
import { BagOfSkipGrams } from "ml/BagOfSkipGrams";
import { SkipGrams } from "ml/SkipGrams";
import { getSkipGrams } from "services/resource-processor/ExtractBOSG";
import { SkipGram } from "types/db-objects/SkipGram";
import { selectNewsSourceHomepages, genericSQLPromise } from "data";
import { ResourceThrottle } from "types/db-objects/ResourceThrottle";
import { BagOfWords } from "ml/BagOfWords";
import { Predicate } from "types/db-objects/Predicate";
import { EXTRACTORS } from "services/resource-processor/functions";
import { EXCLUDE } from "services/resource-processor/HTMLProcessor";
import { Bag } from "ml/Bag";

// WIP
export function main0() {
    const input = fs.readFileSync("/tmp/raw.html");
    const dom = new JSDOM(input);
    const body = dom.window.document.body;
    const stack: Element[] = [];
    stack.push(body);
    const stringBuilder = [];
    while (stack.length) {
        const parent = stack.pop();
        const children = parent.children;
        const length = children.length;
        if (length) {
            for (let i = 0; i < length; ++i) {
                const child = children.item(i);
                if (!EXCLUDE.has(child.tagName.toUpperCase())) {
                    stack.push(child);
                }
            }
        } else {
            let current = parent;

            const subDocument: Dictionary<string> = {};
            if (current.textContent)
                subDocument.text = current.textContent;
            const attributes = current.attributes;
            for (let i = 0; i < attributes.length; ++i) {
                let { name, value }= attributes.item(i);
                subDocument[name] = value;
            }
            for (let [key, value] of Object.entries(subDocument)) {
                value = value.replace(/(\s|\n)+/g, " ").replace(/(^ )|( $)/g, "")
                if (value) subDocument[key] = value;
                else delete subDocument[key];
            }
            process.stdout.write(JSON.stringify(subDocument));
            do {
                if (current === parent) stringBuilder.push(Buffer.from("\t"));
                else stringBuilder.push(Buffer.from(" "));
                stringBuilder.push(Buffer.from(current.tagName.toLowerCase()));
                if (current.className && typeof current.className === "string")
                    for (const c of current.className.split(/ +/g))
                        stringBuilder.push(Buffer.from(` .${c}`));
                if (current.id)
                    stringBuilder.push(Buffer.from(` #${current.id}`));
                current = current.parentElement;
            } while (current);
            stringBuilder.push(Buffer.from("\n"));
        }
    }
    stringBuilder.pop();
    const output = Buffer.concat(stringBuilder);
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
        const buffer = await new ResourceID(resource).readLatest(VersionType.TOKENS);
        if (buffer) {
            const rep = getSkipGrams({ buffer }, 2, 1);
            for (const [key, val] of rep.objects) {
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

export async function main33() {
    const pages = await selectNewsSourceHomepages();
    const throttles: ResourceThrottle[] = [];
    for (const resource of pages)
        throttles.push(new ResourceThrottle(resource, 60 * 60 * 1000));
    console.log(throttles);
}

export async function predict(predicate: Predicate, format: VersionType, input: [bigint, Bag<any>][]) {
    const posBuffer = await predicate.readLatest(format, Predicate.TRUE_SUFFIX);
    const negBuffer = await predicate.readLatest(format, Predicate.FALSE_SUFFIX);
    const posBag = new Bag().fromBuffer(posBuffer);
    const negBag = new Bag().fromBuffer(negBuffer);
    const rows = await genericSQLPromise(sql.SELECT_RESOURCE_VERSIONS_FOR_WIKI_NEWS_SOURCE_PREDICTION);
    const results = [];
    let i = 0;
    for (const [id, bag] of input) {
        let score = 0;
        for (const [ termID, count ] of bag.bag) {
            const posCount = posBag.bag.get(termID) || 0;
            const posTotal = posBag.getTotal();
            const negCount = negBag.bag.get(termID) || 0;
            const negTotal = negBag.getTotal();
            const pPos = (posCount + 1) / (posTotal + 2);
            const pNeg = (negCount + 1) / (negTotal + 2);
            score += Math.log((pPos * (1 - pNeg)) / (pNeg * (1 - pPos)));
        }
        results.push([id, score]);
    }
    results.sort((a, b) => a[1] - b[1]);

    return results;
}

export async function main() {
    console.log("ok");
    for (const c of EXTRACTORS) {
        const from = new c().from().map(v => v.filename);
        const to = new c().to().map(v => v.filename);
        console.log(
            `or (tt.filename in (${to.map(t => `"${t}"`).join(", ")}) and ft.filename in (${from.map(f => `"${f}"`).join(", ")}))`
        );
    }
    await SQL.destroy();
    await Redis.quit();
}

main0();