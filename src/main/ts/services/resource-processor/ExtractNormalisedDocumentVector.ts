import { ResourceURL } from "types/db-objects/ResourceURL";
import { VersionType } from "types/db-objects/VersionType";
import { Dictionary } from "utils/alpha";
import { selectDocumentWordVectors, selectWordFrequencies } from "data";
import { WordVector } from "types/db-objects/WordVector";
import { ResourceVector } from "types/db-objects/ResourceVector";
import { WordVectorSource } from "types/db-objects/WordVectorSource";
import { Vector } from "types/db-objects/Vector";
import { InputCache } from "./functions";
import { ExtractDocumentVector } from "./ExtractDocumentVector";
import { Word } from "types/db-objects/Word";

// The ratio of semantic worth between the last word and the first word in the
// document, from a reader's perspective. 0 would mean that words near the end
// of a document play little to no role in the document's overall
// classification, whereas 1 would cause all words in the document to play an
// equal role.
const LWN = 0.2;
// High sharpness means a reader starts extracting categories quicker around the
// turning point of the document. Low sharpness means that the reader reaches
// meaning more gradually around the turning point.
const SHARPNESS = 15;
// At what position are words worth half to the reader what words at
// the top are worth to the reader? (replace 'half' with some other
// mid-proportion if LWN != 0).
const MID = 0.8;
/**
 * 
 * @param position the position in the document (1 = nearer to the start, 0 =
 *                 nearer to the end).
 */
export function getPositionFactor(position: number) {
    return LWN + (1 - LWN) * (1 / (1 + Math.exp((10 / MID) * (position - MID))))
}

export class ExtractNormalisedDocumentVector extends ExtractDocumentVector {
    async apply(resource: ResourceURL, input: Dictionary<InputCache>, time?: number) {
        const cache = input[this.from()[0].filename];
        const tokens = cache.buffer.toString().split(/\s+/g);
        const wordIDs = tokens.map(token => new Word(token).getID());
        const vectors =
            new Map((await selectDocumentWordVectors(wordIDs)).map(row => [BigInt(row.word), row.value]));
        const frequencies =
            new Map((await selectWordFrequencies(wordIDs)).map(row => [BigInt(row.word), row.frequency]));
        let minFrequency = 1;
        for (const f of frequencies.values()) if (f < minFrequency) minFrequency = f;
        const length = wordIDs.length;
        let sum: number[];
        for (let i = 0; i < length; ++i) {
            const position = 1 - i / length;
            const positionFactor = getPositionFactor(position);
            const wordID = wordIDs[i];
            const vectorBuffer = vectors.get(wordID);
            const frequency = frequencies.get(wordID) || minFrequency;
            if (vectorBuffer) {
                const vector = WordVector.bufferToVector(Buffer.from(vectorBuffer.toString(), "base64"));
                if (!sum) {
                    sum = new Array<number>(vector.length);
                    for (let i = 0; i < sum.length; ++i) sum[i] = 0;
                }
                for (let i = 0; i < vector.length; ++i)
                    sum[i] = sum[i] + (vector[i] / frequency) * positionFactor;
            }
        }
        if (!sum) {
            sum = new Array<number>(300);
            for (let i = 0; i < sum.length; ++i) sum[i] = 0;
        }
        ExtractDocumentVector.normalizeToUnitCircle(sum);
        const outBuffer = WordVector.vectorToBuffer(sum);
        const vector = new Vector(outBuffer);
        new ResourceVector({
            resource,
            source: WordVectorSource.DEFAULT,
            vector,
        }).enqueueInsert({ recursive: true })
        await resource.writeVersion(time, this.to()[0], outBuffer);
    }
    from() {
        return [VersionType.TOKENS];
    }
    to() {
        return [VersionType.NORMALISED_DOCUMENT_VECTOR];
    }
}