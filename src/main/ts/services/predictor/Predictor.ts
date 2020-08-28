import { Predicate } from "types/db-objects/Predicate";
import { Classifier } from "ml/classifiers/Classifier";
import { DBObject } from "types/DBObject";

type Features<K> = Map<K, number>
export type QueryCase<K, O> = [O, Features<K>];

export abstract class Predictor<K = any, O extends DBObject<O> = any> {
    abstract frequency(): number;

    abstract getPredicate(): Predicate;

    abstract emptyClassifier(): Classifier<K>;

    abstract async getItemsToClassify(): Promise<QueryCase<K, O>[]>;

    abstract getFuzzyLabel(object: O, p: number): DBObject;

    async predict() {
        const predicate = this.getPredicate();
        const classifier = await this.emptyClassifier().read(predicate);
        const itemsToClassify = await this.getItemsToClassify();
        const length = itemsToClassify.length;
        const promises = new Array<Promise<void>>(length);
        for (let i = 0; i < length; ++i) {
            const [object, features] = itemsToClassify[i];
            const p = classifier.fuzzyClassify(features).find(([t]) => t)[1];
            promises[i] = this.getFuzzyLabel(object, p).enqueueInsert({ recursive: true, });
        }

        await Promise.all(promises);
    }
}