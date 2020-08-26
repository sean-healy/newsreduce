import { GenericConstructor } from "types/GenericConstructor";
import { Leaf } from "./Leaf";
import { TreeMetaData } from "./TreeMetaData";
import { Fork } from "./Fork";
import { NonLeaf } from "./NonLeaf";
import { CategoricalFork } from "./CategoricalFork";
import { Feature } from "./Feature";
import { Scalar } from "./Scalar";
import { Categorical } from "./Categorical";
import { ForkType } from "./ForkType";
import { ScalarFork } from "./ScalarFork";
import { WeightedTrainingData } from "./WeightedTrainingData";
import { ScoredPotentialFork } from "./ScoredPotentialFork";

export class DecisionTree<K> extends GenericConstructor<DecisionTree<K>> {
    static readonly DEFAULT_DEPTH = 20;

    readonly fork: Fork;
    
    classify(features: Map<K, number>) {
        let fork = this.fork;
        while (fork instanceof NonLeaf) {
            fork = fork.next(features);
        }
        
        return (fork as Leaf).category;
    }


    static countCategories<D, C>(data: D[], mapper: (row: D) => C) {
        const counts = new Map<C, number>();
        for (const row of data) {
            const category = mapper(row);
            const count = counts.get(category) || 0;
            counts.set(category, count + 1);
        }

        return counts;
    }

    static countCategoriesUnlabelled<D, C>(data: D[], mapper: (row: D) => C) {
        return DecisionTree.countCategories(data, mapper).values();
    }

    static categoryCount<D, C>(data: D[], mapper: (row: D) => C) {
        return new Set(data.map(row => mapper(row))).size;
    }
    static maxCategory<K>(data: WeightedTrainingData<K>) {
        const weights = [0, 0];
        for (const [, category, weight] of data)
            weights[category] += weight;
        return weights[0] > weights[1] ? 0 : 1;
    }

    static parse<K>(arg: Buffer | any) {
        let tree: any;
        if (arg instanceof Buffer)
            tree = JSON.parse(arg.toString());
        else tree = arg;
        const parsedBranches = new Map();
        for (let key in tree.fork) {
            const node = tree.branches[key];
            let anyKey: any = key;
            if (anyKey === "true") anyKey = true;
            else if (anyKey === "false") anyKey = false;
            let value: any;
            if (typeof node === "object")
                value = new Leaf({ category: 1 });
            else if (node === "false")
                value = new Leaf({ category: 0 });
            else
                value = new Leaf({ category: node });
            parsedBranches.set(anyKey, value);
        }
        tree.branches = parsedBranches;

        return new DecisionTree<K>(tree);
    }

    selectFeatures(features: Feature<K>[]) {
        return features;
    }

    train(data: WeightedTrainingData<K>, metaData: TreeMetaData<K>) {
        return new DecisionTree<K>({
            fork: this.trainFork(data, metaData),
        });
    }

    static processFeatureMetaData<K>(data: WeightedTrainingData<K>) {
        const featureValues = new Map<K, Set<number>>();
        const scalarFeatures = new Set<K>();
        const categoricalFeatures = new Set<K>();
        const featureMatrix = new Map<K, number[]>();
        for (let i = 0; i < data.length; ++i) {
            const [features, ] = data[i];
            for (const [feature, value] of features) {
                const row = featureMatrix.get(feature) || [];
                row.push(i);
                featureMatrix.set(feature, row);
                featureValues.set(feature, (featureValues.get(feature) || new Set()).add(value));
                if (!([1, 0, 1n, 0n]).includes(value))
                    scalarFeatures.add(feature);
                else
                    categoricalFeatures.add(feature);
            }
        }
        const features: Feature<K>[] = [];
        for (const [key, values] of featureValues) {
            const occurrences = featureMatrix.get(key);
            const scalar = scalarFeatures.has(key);
            const categorical = categoricalFeatures.has(key);
            let feature: Feature<K>;
            if (scalar && categorical) {
                const iterator = values.values();
                const first = iterator.next().value as number;
                let min = first;
                let max = first;
                let next: IteratorResult<number, number>;
                let sum = first;
                let count = 1;
                while (!(next = iterator.next()).done) {
                    const nextNumber = next.value as any as number;
                    if (nextNumber > max) max = nextNumber;
                    if (nextNumber < max) min = nextNumber;
                    sum += nextNumber;
                    ++count;
                }
                const mean = sum / count;
                feature = new Scalar({ min, max, mean, key, occurrences });
            } else
                feature = new Categorical({ values, key, occurrences })
            features.push(feature);
        }

        return features;
    }

    bestFork(data: WeightedTrainingData<K>, metaData: TreeMetaData<K>) {
        let feature: Feature<K> = null;
        let preFork: ScoredPotentialFork<K>;
        let minScore = 1;
        const useless = new Set<K>()
        for (const candidateFeature of this.selectFeatures(metaData.features)) {
            process.stdout.write(`${candidateFeature.key} `);
            const candidateFork = candidateFeature.bestWeightedSplit(data);
            if (candidateFork) {
                let featureImpurity = 0;
                for (const split of candidateFork.branches) {
                    const countIterator = DecisionTree.countCategoriesUnlabelled(split, row => row[1]);
                    const splitImpurity = Feature.giniImpurity(countIterator);
                    const splitWeight = split.length / data.length;
                    featureImpurity += splitImpurity * splitWeight;
                }
                if (featureImpurity < minScore)
                    [minScore, feature, preFork] = [featureImpurity, candidateFeature, candidateFork];
            } else  {
                useless.add(candidateFeature.key);
            }
        }

        return { feature, preFork, useless };
    }

    /**
     * @param data     the rows of data at a given node in the decision tree, as
     *                 a map of features to values.
     * @param metaData a map of features to the values those features may take,
     *                 along with a list of valid categories.
     */
    private trainFork(data: WeightedTrainingData<K>, metaData: TreeMetaData<K>) {
        let fork: Fork;
        if (metaData.depth === 0) {
            const category = DecisionTree.maxCategory(data);
            console.log("Most points at max depth are", category);
            fork = new Leaf({ category });
        } else if (DecisionTree.categoryCount(data, ([, category]) => category) === 1)
            fork = new Leaf({ category: data[0][1] });
        else {
            if (!metaData.categories) metaData.categories = [...new Set(data.map(([, category]) => category))];
            if (!metaData.depth) metaData.depth = DecisionTree.DEFAULT_DEPTH;
            if (!metaData.features) metaData.features = DecisionTree.processFeatureMetaData(data);
            let { feature, preFork, useless } = this.bestFork(data, metaData);
            if (feature) {
                //console.log(feature, preFork.branches.map(b => b.length));
                const nextMetaData = {
                    ...metaData,
                    features: metaData.features.filter(f => !useless.has(f.key)),
                    depth: metaData.depth - 1,
                };
                const left = this.trainFork(preFork.branches[0], nextMetaData);
                const right = this.trainFork(preFork.branches[1], nextMetaData);
                if (left instanceof Leaf && right instanceof Leaf && left.category === right.category)
                    fork = new Leaf({ category: left.category });
                else {
                    switch (preFork.type) {
                        case ForkType.CATEGORICAL:
                            fork = new CategoricalFork<K>({
                                feature: feature.key,
                                branches: [ left, right ],
                            });
                            break;
                        case ForkType.SCALAR:
                            fork = new ScalarFork<K>({
                                feature: feature.key,
                                left,
                                right,
                                pivot: preFork.conditionalData as number,
                            });
                            break;
                    }
                }
            } else
                fork = new Leaf({ category: DecisionTree.maxCategory(data) });
        }

        return fork;
    }

    toJSON() {
        return { fork: this.fork.toJSON() }
    }
}