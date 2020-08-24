import { ResourceURL } from "types/db-objects/ResourceURL";
import { VersionType } from "types/db-objects/VersionType";
import { ResourceProcessor } from "./ResourceProcessor";
import { Dictionary } from "utils/alpha";
import { getRepresentations } from "./ExtractBOW";
import { selectDocumentWordVectors } from "data";
import { WordVector } from "types/db-objects/WordVector";
import { ResourceVector } from "types/db-objects/ResourceVector";
import { WordVectorSource } from "types/db-objects/WordVectorSource";
import { Vector } from "types/db-objects/Vector";
import { InputCache } from "./functions";

function distanceFromOrigin(vector: number[]) {
    let squaredDistance = 0;
    for (const coord of vector)
        squaredDistance += coord ** 2;

    return Math.sqrt(squaredDistance);
}

function normalizeToUnitCircle(vector: number[]) {
    const d = distanceFromOrigin(vector);
    if (d != 0)
        for (let i = 0; i < vector.length; ++i)
            vector[i] = vector[i] / d;
}

export class ExtractDocumentVector extends ResourceProcessor {
    async apply(resource: ResourceURL, input: Dictionary<InputCache>, time?: number) {
        const cache = input[this.from()[0].filename];
        const wordIDs = [...getRepresentations(cache).bag.keys()];
        const rows = await selectDocumentWordVectors(wordIDs);
        let sum = new Array<number>(300);
        for (let i = 0; i < sum.length; ++i) sum[i] = 0;
        for (const row of rows) {
            const vector = WordVector.bufferToVector(Buffer.from(row.value.toString(), "base64"));
            for (let i = 0; i < vector.length; ++i)
                sum[i] = sum[i] + vector[i];
        }
        normalizeToUnitCircle(sum);
        const outBuffer = WordVector.vectorToBuffer(sum);
        const vector = new Vector(outBuffer);
        new ResourceVector({
            resource,
            source: WordVectorSource.DEFAULT,
            vector,
        }).enqueueInsert({ recursive: true })
        await resource.writeVersion(time, VersionType.DOCUMENT_VECTOR, outBuffer);
    }
    from() {
        return [VersionType.REDUCED_TOKENS];
    }
    to() {
        return [VersionType.DOCUMENT_VECTOR];
    }
}