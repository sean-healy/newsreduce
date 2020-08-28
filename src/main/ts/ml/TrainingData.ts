import { GenericConstructor } from "types/GenericConstructor";
import { DecisionTree } from "./classifiers/dt/trees/DecisionTree";

export class TrainingData<K> extends GenericConstructor<TrainingData<K>> {
    readonly features: Map<K, number>[];
    readonly labels: number[];
    readonly weights: number[];
    length: number;

    sortByFeature(feature: K) {
        const { length } = this;
        type Value = number;
        type Index = number;
        const sortData = new Array<[Value, Index]>(length);
        for (let i = 0; i < length; ++i) {
            const features = this.features[i];
            sortData.push([features.get(feature) || 0, i]);
        }
        sortData.sort(([a], [b]) => a - b);
        const sortedData = TrainingData.initWithLength<K>(length);
        for (let newIndex = 0; newIndex < length; ++newIndex) {
            const [, oldIndex] = sortData[newIndex];
            sortedData.features[newIndex] = this.features[oldIndex];
            sortedData.labels[newIndex] = this.labels[oldIndex];
            sortedData.weights[newIndex] = this.weights[oldIndex];
        }

        return sortedData;
    }

    get(i: number) {
        return {
            features: this.features[i],
            label: this.labels[i],
            weight: this.weights[i],
        };
    }

    slice(a: number, b?: number): TrainingData<K> {
        const labels = this.labels.slice(a, b);
        const weights = this.weights.slice(a, b);
        const features = this.features.slice(a, b);
        const length = features.length;
        return new TrainingData({ labels, weights, features, length })
    }

    updateWeights(
        tree: DecisionTree<K>,
        epsilon: number,
        alpha: number,
    ) {
        const { length, weights, features, labels } = this;
        for (let i = 0; i < length; ++i) {
            const weight = weights[i];
            const actualCategory = labels[i];
            const expectedCategory = tree.classify(features[i]);
            const pow = actualCategory === expectedCategory ? 1 : -1;
            const numer = weight * Math.exp(-alpha * pow);
            const denom = 2 * Math.sqrt(epsilon * (1 - epsilon));
            weights[i] =  numer / denom;
        }
    }

    split(ratio: number) {
        if (ratio < 0 || ratio > 1) throw new Error(`invalid ratio: ${ratio}`);
        let trainingLength = Math.floor(this.length * ratio);
        let testLength = this.length - trainingLength;
        const trainingData = TrainingData.initWithLength<K>(0);
        const testData = TrainingData.initWithLength<K>(0);
        for (let i = 0; i < this.length; ++i) {
            let data: TrainingData<K>;
            if (testLength-- === 0) data = trainingData;
            else if (trainingLength-- === 0) data = testData;
            else if (Math.random() < ratio) data = trainingData;
            else data = testData;
            const { features, weight, label } = this.get(i);
            data.features.push(features);
            data.weights.push(weight);
            data.labels.push(label);
            ++data.length;
        }

        return { trainingData, testData };
    }

    static initWithLength<K>(length: number) {
        const data = new TrainingData<K>({
            features: new Array(length),
            labels: new Array(length),
            weights: new Array(length),
            length,
        });

        return data;
    }

    static concat<K>(...data: TrainingData<K>[]) {
        const length = data.map(data => data.length).reduce((a, b) => a + b);
        const concatData = TrainingData.initWithLength<K>(length);
        const args = data.length;
        let k = 0;
        for (let i = 0; i < args; ++i) {
            const arg = data[i];
            const argLength = arg.length;
            for (let j = 0; j < argLength; ++j) {
                concatData.features[k] = arg.features[j];
                concatData.labels[k] = arg.labels[j];
                ++k;
            }
        }
        const weight = 1 / length;
        for (let i = 0; i < length; ++i)
            concatData.weights[i] = weight;

        return concatData;
    }
}