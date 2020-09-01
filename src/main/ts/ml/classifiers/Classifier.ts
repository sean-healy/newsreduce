import { GenericConstructor } from "types/GenericConstructor";
import { ClassifierType } from "./ClassifierType";
import { ClassifierTrainingArgs } from "ml/classifiers/args/ClassifierTrainingArgs";
import { TrainingData } from "ml/TrainingData";
import { VersionType } from "types/db-objects/VersionType";
import { Predicate } from "types/db-objects/Predicate";
import { DBObject } from "types/DBObject";
import { CSVWriter } from "analytics/CSVWriter";

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
    abstract train(args: I, csvWriter: CSVWriter): C;
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
        const buffer = await predicate.readLatest(this.fsVersionType());
        return this.parse(buffer);
    }

    toJSON() {
        return {
            type: this.type(),
            ...this.toJSONEtc(),
        }
    }

    protected printProgress(
        args: ClassifierTrainingArgs<K>,
        ensemble: Classifier<K, I, C>,
        i: number,
        csvWriter: CSVWriter,
    ) {
        const data = args.data;
        let TrainFN = 0;
        let TrainFP = 0;
        let TrainTN = 0;
        let TrainTP = 0;
        for (let i = 0; i < data.length; ++i) {
            const features = data.features[i];
            const actual = data.labels[i];
            const [expected] = ensemble.hardClassify(features);
            if (expected && actual) ++TrainTP;
            if (!expected && !actual) ++TrainTN;
            if (!expected && actual) {
                ++TrainFN;
            }
            if (expected && !actual) ++TrainFP;
        }
        let TestFN = 0;
        let TestFP = 0;
        let TestTN = 0;
        let TestTP = 0;
        for (let i = 0; i < args.testData.length; ++i) {
            const features = args.testData.features[i];
            const actual = args.testData.labels[i];
            const [expected] = ensemble.hardClassify(features);
            if (expected && actual) ++TestTP;
            if (!expected && !actual) ++TestTN;
            if (!expected && actual) {
                ++TestFN;
            }
            if (expected && !actual) ++TestFP;
        }
        csvWriter.append(i, "training", TrainFN, TrainFP, TrainTN, TrainTP);
        csvWriter.append(i, "test", TestFN, TestFP, TestTN, TestTP);
    }

    protected precisionAndRecall(args: ClassifierTrainingArgs<K>, ensemble: Classifier<K, I, C>) {
        let fn = 0;
        let fp = 0;
        let tn = 0;
        let tp = 0;
        for (let i = 0; i < args.testData.length; ++i) {
            const features = args.testData.features[i];
            const actual = args.testData.labels[i];
            const [expected, surety] = ensemble.hardClassify(features);
            if (expected && actual) ++tp;
            if (!expected && !actual) ++tn;
            if (!expected && actual) {
                ++fn;
            }
            if (expected && !actual) ++fp;
        }
        let precision = tp / (tp + fp);
        let recall = tp / (tp + fn);

        return { precision, recall };
    }
}