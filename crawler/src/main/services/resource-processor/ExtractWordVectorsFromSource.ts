import { ResourceVersionType } from "types/objects/ResourceVersionType";
import { ResourceURL } from "types/objects/ResourceURL";
import { ResourceProcessor } from "./ResourceProcessor";
import { Dictionary, spawnPromise, fancyLog, bytesToBigInt } from "common/util";
import fs from "fs";
import { randomBufferFile } from "file";
import { spawn } from "child_process";
import { WordVectors } from "types/WordVectors";
import { PromisePool } from "common/PromisePool";
import { WordVector } from "types/objects/WordVector";
import { SQL } from "common/SQL";
import { bulkInsert } from "services/inserter/functions";
import { Vector } from "types/objects/Vector";

const UNZIP = "unzip"

export class ExtractWordVectorsFromSource extends ResourceProcessor {
    ro() { return true; }
    async apply(resource: ResourceURL, input: Dictionary<ResourceURL>, time: number): Promise<void> {
        console.log(resource.getID());
        const compressedTMP = randomBufferFile();
        console.log(compressedTMP);
        const outputStream = fs.createWriteStream(compressedTMP);
        const inputStream = await resource.stream(time, ResourceVersionType.RAW_ZIP);
        console.log({ inputStream: !!inputStream });
        inputStream.pipe(outputStream);
        await new Promise<void>(res => {
            outputStream.on("close", async () => {
                console.log("write complete")
                const lsOutput = (await spawnPromise(() => spawn(UNZIP, ["-l", compressedTMP]))).toString();
                const path = lsOutput
                    .split("\n")
                    .map(line => line.match(/[^ ]+.vec$/))
                    .filter(notNull => notNull)
                    .map(match => match[0])[0];
                fancyLog(path);
                const inputStream = spawn(UNZIP, ["-p", compressedTMP, path]).stdout;
                fancyLog("spawned")
                const wordVectors = await WordVectors.fromStream(inputStream, resource);
                fancyLog(`vectors: ${wordVectors.vectors.size}`);
                const tmpFile = await wordVectors.toBuffer();
                fancyLog("created buffer " + tmpFile);
                let stream = fs.createReadStream(tmpFile);
                try {
                    await resource.writeVersion(time, ResourceVersionType.WORD_EMBEDDINGS, stream);
                } catch (e) {
                    fancyLog("error writing word embedding file:")
                    fancyLog(JSON.stringify(e));
                }
                try {
                    fancyLog("wrote embeddings to file for " + resource.getID());
                    const fd = fs.openSync(tmpFile, "r");
                    const CHUNK_SIZE = 612;
                    const buffer = Buffer.alloc(CHUNK_SIZE);
                    const vectorCSV = randomBufferFile();
                    const wordVectorCSV = randomBufferFile();
                    const vectorCSVWrite = fs.createWriteStream(vectorCSV);
                    const wordVectorCSVWrite = fs.createWriteStream(wordVectorCSV);
                    const finish = Promise.all([
                        new Promise(res => vectorCSVWrite.on("finish", res)),
                        new Promise(res => wordVectorCSVWrite.on("finish", res)),
                    ]);
                    fancyLog("writing CSV");
                    fancyLog(JSON.stringify({ vectorCSV, wordVectorCSV }));
                    const sourceID = resource.getID();
                    let lines = 0;
                    for (let read = fs.readSync(fd, buffer, 0, CHUNK_SIZE, null); read > 0; read = fs.readSync(fd, buffer, 0, CHUNK_SIZE, null)) {
                        if (!(lines & 0b1111111111111)) fancyLog(JSON.stringify({lines: lines, read}))
                        lines++;
                        const id = bytesToBigInt(buffer.slice(0, 12));
                        const tail = buffer.slice(12, buffer.length)
                        const vector = new Vector(tail);
                        const vectorID = vector.getID();
                        const vectorRow = SQL.csvRow([vectorID, vector.value]);
                        const wordVectorRow = SQL.csvRow([id, sourceID, vectorID]);
                        vectorCSVWrite.write(vectorRow + "\n");
                        wordVectorCSVWrite.write(wordVectorRow + "\n");
                    }
                    fancyLog("closing read stream");
                    fs.closeSync(fd);
                    fancyLog("ending write stream.");
                    vectorCSVWrite.end();
                    wordVectorCSVWrite.end();
                    fancyLog("awaiting finish")
                    await finish;
                    fancyLog("bulk insert word vec CSV");
                    await new WordVector().bulkInsert(wordVectorCSV);
                    fancyLog("bulk insert vector CSV");
                    await new Vector().bulkInsert(vectorCSV);
                    fancyLog("cleanup");
                    fs.unlinkSync(tmpFile);
                    fs.unlinkSync(compressedTMP);
                    fs.unlinkSync(vectorCSV);
                    fs.unlinkSync(wordVectorCSV);
                    res();
                } catch (e) {
                    fancyLog(JSON.stringify(e));
                    res();
                }
            });
            outputStream.on("error", e => {
                fancyLog(JSON.stringify(e));
                fs.unlinkSync(compressedTMP);
                res();
            })
        });
        console.log("Done.");
    }
    hosts() {
        return new Set(["dl.fbaipublicfiles.com"]);
    }
    from() {
        return new Set([ResourceVersionType.RAW_ZIP_FILE]);
    }
    to() {
        return new Set([ResourceVersionType.WORD_EMBEDDINGS_FILE]);
    }
}
