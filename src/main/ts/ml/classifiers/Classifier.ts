import { GenericConstructor } from "types/GenericConstructor";
import { ClassifierType } from "./ClassifierType";
import { ClassifierTrainingArgs } from "ml/classifiers/args/ClassifierTrainingArgs";
import { TrainingData } from "ml/TrainingData";
import { VersionType } from "types/db-objects/VersionType";
import { Predicate } from "types/db-objects/Predicate";
import { DBObject } from "types/DBObject";

type Label = number;
type FuzzyLabel = [Label, number];

export abstract class Classifier<
    K,
    I extends ClassifierTrainingArgs<K> = any,
    C extends Classifier<K, I, C> = Classifier<K, I, any>
>
extends GenericConstructor<C> {
    abstract hardClassify(features: Map<K, number>): FuzzyLabel;
    abstract fuzzyClassify(features: Map<K, number>): FuzzyLabel[];
    abstract train(args: I): C;
    abstract type(): ClassifierType;
    abstract toJSONEtc(): any;
    abstract fsVersionType(): VersionType;
    abstract parse(input: any | Buffer): C;

    async write(predicate: Predicate) {
        const json = this.toJSON();
        DBObject.stringifyBigIntsInPlace(json);
        const buffer = Buffer.from(JSON.stringify(json));
        predicate.writeVersion(Date.now(), this.fsVersionType(), buffer);
    }

    async read(predicate: Predicate) {
        const buffer = predicate.readLatest(this.fsVersionType());
        return this.parse(buffer);
    }

    toJSON() {
        return {
            type: this.type(),
            ...this.toJSONEtc(),
        }
    }

    protected printProgress(data: TrainingData<K>, ensemble: Classifier<K, I, C>) {
        let FN = 0;
        let FP = 0;
        let TN = 0;
        let TP = 0;
        for (let i = 0; i < data.length; ++i) {
            const features = data.features[i];
            const actual = data.labels[i];
            const [expected, surety] = ensemble.hardClassify(features);
            if (expected && actual) ++TP;
            if (!expected && !actual) ++TN;
            if (!expected && actual) {
                ++FN;
            }
            if (expected && !actual) ++FP;
        }
        let Accuracy = Number((((TN + TP) / (TN + TP + FN + FP)) * 100).toFixed(2));
        let Precision = Number(((TP / (TP + FP)) * 100).toFixed(2));
        let Recall = Number(((TP / (TP + FN)) * 100).toFixed(2));
        console.log({ FN, FP, TN, TP, Precision, Recall });
    }
}