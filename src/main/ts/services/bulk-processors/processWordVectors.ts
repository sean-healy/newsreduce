import { ResourceURL } from "types/db-objects/ResourceURL";
import { bytesToBigInt, fancyLog } from "utils/alpha";
import { getWordVectorDir, safeMkdir } from "common/config";
import fs from "fs";
import { randomBufferFile } from "file";
import { WordVectors } from "types/WordVectors";
import { WordVector } from "types/db-objects/WordVector";
import { SQL } from "common/SQL";
import { Vector } from "types/db-objects/Vector";
import { join } from "path"
import { argv } from "yargs";
import { Word } from "types/db-objects/Word";

// 12 bytes per word ID, and 2 bytes per dimension (300 * 2 + 12 = 612)
const CHUNK_SIZE = 612;

async function main(url: string, label: string, path: string, nosql: boolean): Promise<void> {
    const dir = await getWordVectorDir();
    safeMkdir(dir);
    const dst = join(dir, `${label}.bin`);
    if (fs.existsSync(dst)) return;
    const resource = new ResourceURL(url);
    fancyLog("Loading into memory");
    const vectors = await WordVectors.fromTextPath(path, resource);
    fancyLog("Saving to tmp file.");
    const tmp = await vectors.toBufferFile();
    fs.renameSync(tmp, dst);
    if (!nosql) {
        fancyLog("Building bulk insert CSVs.");
        const fd = fs.openSync(dst, "r");
        const buffer = Buffer.alloc(CHUNK_SIZE);
        const vectorCSV = randomBufferFile();
        const wordVectorCSV = randomBufferFile();
        const wordCSV = randomBufferFile();
        console.log({
            vectorCSV,
            wordVectorCSV,
            wordCSV,
        });
        const vectorCSVWrite = fs.createWriteStream(vectorCSV);
        const wordVectorCSVWrite = fs.createWriteStream(wordVectorCSV);
        const wordCSVWrite = fs.createWriteStream(wordCSV);
        fancyLog("Created write streams.");
        const finish = Promise.all([
            new Promise(res => vectorCSVWrite.on("finish", res)),
            new Promise(res => wordVectorCSVWrite.on("finish", res)),
            new Promise(res => wordCSVWrite.on("finish", res)),
        ]);
        fancyLog("Created end promises.");
        for (let read = fs.readSync(fd, buffer, 0, CHUNK_SIZE, null); read > 0; read = fs.readSync(fd, buffer, 0, CHUNK_SIZE, null)) {
            const id = bytesToBigInt(buffer.slice(0, 12));
            const tail = buffer.slice(12, buffer.length);
            const vector = new Vector(tail);
            const vectorID = vector.getID();
            const vectorRow = SQL.csvRow([vectorID, vector.value.toString("base64")]);
            const wordVectorRow = SQL.csvRow([id, resource.getID(), vectorID]);
            const wordRow = SQL.csvRow([id, vectors.vectors.get(id).word.value]);
            vectorCSVWrite.write(vectorRow + "\n");
            wordVectorCSVWrite.write(wordVectorRow + "\n");
            wordCSVWrite.write(wordRow + "\n");
        }
        fs.closeSync(fd);
        fancyLog("Closed fd.");
        vectorCSVWrite.end();
        wordVectorCSVWrite.end();
        wordCSVWrite.end();
        fancyLog("End.");
        await finish;
        fancyLog("Inserting bulk.");
        await new WordVector().bulkInsert(wordVectorCSV);
        await new Vector().bulkInsert(vectorCSV);
        await new Word().bulkInsert(wordCSV);
        fancyLog("Cleanup.");
        fs.unlinkSync(vectorCSV);
        fs.unlinkSync(wordVectorCSV);
        fs.unlinkSync(wordCSV);
        (await SQL.db()).destroy();
    }
}

const label = <string>argv.label;
const url = <string>argv.url;
const nosql = <string>argv.nosql;
const path = process.argv[process.argv.length - 1];
const help = `Usage: process-word-vectors --label LABEL --url URL PATH [--nosql]`
if (!label || !url || !path) console.debug(help);
else {
    main(url, label, path, !!nosql);
}