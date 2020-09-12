import { TrainingData } from "ml/TrainingData";
import { Predicate } from "types/db-objects/Predicate";
import { Classifier } from "ml/classifiers/Classifier";
import { ClassifierTrainingArgs } from "ml/classifiers/args/ClassifierTrainingArgs";
import { CSVWriter } from "analytics/CSVWriter";
import fs from "fs";
import { randomBufferFile } from "file";
import { spawn } from "child_process";
import { AdaBoost } from "ml/classifiers/dt/forests/AdaBoost";

const DECISION_TREES_CMD = "decision-trees";

/**
 * This class encapsulates the processes
 * involved in training ML models such
 * as naive-bayes or decision trees.
 */
export abstract class Trainer<
    K = any,
    I extends ClassifierTrainingArgs<K> = ClassifierTrainingArgs<K>
> {
    /**
     * Return the time period in milliseconds between invocations of the model
     * trainer.
     */
    abstract frequency(): number;
    /**
     * How many trees to train.
     */
    abstract trees(): number;
    /**
     * Maximum depth per tree.
     */
    abstract depth(): number;
    /**
     * Return data for training and testing the model.
     * This is the bridge to SQL and the file system.
     */
    abstract async fetchTrainingAndTestData(): Promise<TrainingData<K>>;
    /**
     * Return the ratio of training data to test data.
     */
    abstract trainingDataRatio(): number;
    /**
     * Get the predicate with which the model corresponds.
     * For example, the predicate "official URL on a wikipedia
     * resource page" is useful for classifying the HTML nodes
     * on a wikipedia page that correspond to the official URL
     * of a news source.
     */
    abstract getPredicate(): Predicate;

    abstract emptyClassifier(): Classifier<K, I>;

    abstract csvWriter(): CSVWriter;

    /**
     * Adjust parameters in order to suit the specific problem
     * of sub-classes.
     * 
     * @param params
     */
    abstract decorateClassifierParams(params: I): void;

    async train() {
        const data = await this.fetchTrainingAndTestData();
        const file = data.toFile();
        console.log(file.toBuffer().length)
        const input = randomBufferFile();
        console.log(input);
        const output = randomBufferFile();
        fs.writeFileSync(input, file.toBuffer());
        const adaBoost = true;
        const featureSampleRatio = 1;
        const dtProcess = spawn(DECISION_TREES_CMD, [
            "-i", input,
            "-d", this.depth().toString(),
            "-t", this.trees().toString(),
            "-s", this.trainingDataRatio().toString(),
            "-r", featureSampleRatio.toString(),
            ...(adaBoost ? ["-a"] : []),
        ]);
        const outputStream = fs.createWriteStream(output);
        dtProcess.stdout.pipe(outputStream);
        dtProcess.stderr.on("data", data => {
            process.stderr.write(data.toString())
        });
        await new Promise(res => dtProcess.on("close", res));
        const tree = JSON.parse(fs.readFileSync(output).toString());
        const model = AdaBoost.fromCJSON<K>(tree, file);

        await model.write(this.getPredicate());
    }
}