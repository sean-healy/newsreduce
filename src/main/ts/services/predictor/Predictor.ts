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
        const promises = new Array<Promise<void>>();
        for await (const [object, features] of itemsToClassify) {
            const fuzzyClasses = classifier.fuzzyClassify(features);
            const pos = fuzzyClasses.find(([t]) => t);
            const neg = fuzzyClasses.find(([t]) => !t);
            if (pos[1] >= 0.50)
                console.log((object as any).toURL(), pos[1], neg[1]);
            if (pos[1] <= 0.47)
                console.log("\t", (object as any).toURL(), pos[1], neg[1]);
            //promises[i] = this.getFuzzyLabel(object, p).enqueueInsert({ recursive: true, });
        }

        //await Promise.all(promises);
    }
}