import { GenericConstructor } from "types/GenericConstructor";

type FeatureID = number;
type FeatureValue = number;
type Class = number;
export type Feature = [FeatureID, FeatureValue]
export type TrainingPoint = [Class, Feature[]];
export class TrainingFile<K = any> extends GenericConstructor<TrainingFile<K>> {
    readonly featureCount: number;
    readonly points: TrainingPoint[]
    readonly featureReverseIndex: Map<number, K>;

    toBuffer() {
        let size = 0;
        size += 4; // For the feature count.
        size += 4; // For the point count.
        size += 5 * this.points.length; // For the feature counts within points, and the class labels.
        for (const [, features] of this.points)
            size += features.length * 8; // For the feature ID and value within this point.
        const buffer = Buffer.alloc(size);
        let offset = 0;
        offset = buffer.writeUInt32LE(this.featureCount, offset)
        offset = buffer.writeUInt32LE(this.points.length, offset)
        let i = 0;
        for (const [c, features] of this.points) {
            offset = buffer.writeInt8(c, offset);
            offset = buffer.writeUInt32LE(features.length, offset);
            for (const [id, value] of features) {
                offset = buffer.writeUInt32LE(id, offset);
                offset = buffer.writeFloatLE(value, offset);
            }
        }

        return buffer;
    }

    lookup(id: number) {
        return this.featureReverseIndex.get(id);
    }
}