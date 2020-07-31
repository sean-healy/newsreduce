import { ResourceVersionType } from "types/objects/ResourceVersionType";
import { ResourceURL } from "types/objects/ResourceURL";
import { ResourceProcessor } from "./ResourceProcessor";
import { Dictionary, spawnPromise, fancyLog } from "common/util";
import fs from "fs";
import { randomBufferFile } from "file";
import { spawn } from "child_process";
import { WordVectors } from "types/WordVectors";

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
                console.log(lsOutput);
                const path = lsOutput
                    .split("\n")
                    .map(line => line.match(/[^ ]+.vec$/))
                    .filter(notNull => notNull)
                    .map(match => match[0])[0];
                fancyLog(path);
                const inputStream = spawn(UNZIP, ["-p", compressedTMP, path]).stdout;
                fancyLog("spawned")
                const wordVectors = await WordVectors.fromStream(inputStream);
                fancyLog(`vectors: ${wordVectors.vectors.size}`);
                fancyLog("read the thing")
                for (const wordVector of wordVectors.vectors.values()) {
                    fancyLog(JSON.stringify(wordVector));
                    wordVector.enqueueInsert({ recursive: true });
                }
                fancyLog("enqueued inserts")
                const tmpFile = await wordVectors.toBuffer();
                fancyLog("created buffer " + tmpFile);
                const stream = fs.createReadStream(tmpFile);
                try {
                    await resource.writeVersion(time, ResourceVersionType.WORD_EMBEDDINGS, stream);
                } catch (e) {
                    fancyLog("error writing word embedding file:")
                    fancyLog(JSON.stringify(e));
                }
                fs.unlinkSync(tmpFile);
                fs.unlinkSync(compressedTMP);
                res();
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
