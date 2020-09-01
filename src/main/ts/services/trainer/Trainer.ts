import { TrainingData } from "ml/TrainingData";
import { Predicate } from "types/db-objects/Predicate";
import { Classifier } from "ml/classifiers/Classifier";
import { ClassifierTrainingArgs } from "ml/classifiers/args/ClassifierTrainingArgs";
import { CSVWriter } from "analytics/CSVWriter";

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
        const { trainingData, testData } = data.split(this.trainingDataRatio());
        const params = { data: trainingData, testData } as I;
        this.decorateClassifierParams(params);
        const model = this.emptyClassifier().train(params, this.csvWriter());
        await model.write(this.getPredicate());
    }
}