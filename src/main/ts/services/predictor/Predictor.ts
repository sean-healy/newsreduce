import { Predicate } from "types/db-objects/Predicate";
import { Classifier } from "ml/classifiers/Classifier";
import { DBObject } from "types/DBObject";
import { fancyLog } from "utils/alpha";

type Features<K> = Map<K, number>
export type QueryCase<K, O> = [O, Features<K>];

export abstract class Predictor<K = any, O extends DBObject<O> = any> {
    abstract frequency(): number;

    abstract getPredicate(): Predicate;

    abstract emptyClassifier(): Classifier<K>;

    abstract getItemsToClassify(): AsyncGenerator<QueryCase<K, O>, void, QueryCase<K, O>>;

    abstract getFuzzyLabel(object: O, p: number): DBObject;

    async predict() {
        const predicate = this.getPredicate();
        fancyLog(`Finding predictions for predicate: ${predicate.functor}.`);
        const classifier = await this.emptyClassifier().read(predicate);
        fancyLog("Initiating generator.");
        const itemsToClassify = this.getItemsToClassify();
        fancyLog("Classifying.");
        for await (const [object, features] of itemsToClassify) {
            const [label, p] = classifier.hardClassify(features);
            if (label == 1) {
                const fuzzyLabel = this.getFuzzyLabel(object, p);
                console.log(object.asString());
                fuzzyLabel.enqueueInsert({ recursive: true });
            }
        }
    }
}