import { GenericConstructor } from "types/GenericConstructor";
import { Leaf } from "./Leaf";
import { TreeMetaData } from "./TreeMetaData";
import { TrainingData } from "./TrainingData";
import { Fork } from "./Fork";
import { NonLeaf } from "./NonLeaf";
import { CategoricalFork } from "./CategoricalFork";
import { Feature } from "./Feature";
import { Scalar } from "./Scalar";
import { Categorical } from "./Categorical";
import { ForkType } from "./ForkType";
import { PotentialFork } from "./PotentialFork";
import { ScalarFork } from "./ScalarFork";

/**
 * @type K the data type used for feature keys
 *       (e.g. functor names in a predicate logic system.)
 * @type V the data type used for feature values
 *         (e.g. booleans for pred. logic, strings for categorical data.)
 * @type C the data type used for category labels,
 *         e.g. strings ("sport", "weather", "tech", etc.), booleans
 *         in simple YES/NO categories (e.g. spam filtering).
 */
export class DecisionTree<K, V, C> extends GenericConstructor<DecisionTree<K, V, C>> {
    static readonly DEFAULT_DEPTH = 20;

    readonly fork: Fork;
    
    classify(features: Map<K, V>, getDefaultValue: (feature: K) => V) {
        let fork = this.fork;
        while (fork instanceof NonLeaf)
            fork = fork.next(features);
        
        return (fork as Leaf<C>).category;
    }


    /**
     * @param data    the data to split
     * @param feature the feature by which the data can be split.
     * 
     * @return the data, split by various values of the feature.
     *         This happens to be stored in a map structure of
     *         feature values to arrays.
     */
    split(data: TrainingData<K, V, C>, feature: K, getDefaultValue: (feature: K) => V) {
        const splitData = new Map<V, TrainingData<K, V, C>>();
        for (const row of data) {
            const [features, ] = row;
            const value = features.get(feature) || getDefaultValue(feature);
            let split = splitData.get(value);
            if (!split) {
                split = [];
                splitData.set(value, split);
            }
            split.push(row);
        }

        return splitData;
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
    static maxCategory<D, C>(data: D[], mapper: (row: D) => C) {
        const counts = new Map<C, number>();
        for (const row of data) {
            const category = mapper(row);
            const count = counts.get(category) || 0;
            counts.set(category, count + 1);
        }
        let maxCount = 0;
        let maxCategory: C = null;
        for (const [category, count] of counts) {
            if (count > maxCount) {
                maxCategory = category;
            }
        }

        return maxCategory;
    }

    static parse<K, V, C>(arg: Buffer | any) {
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
                value = new Leaf({ category: true });
            else if (node === "false")
                value = new Leaf({ category: false });
            else
                value = new Leaf({ category: node });
            parsedBranches.set(anyKey, value);
        }
        tree.branches = parsedBranches;

        return new DecisionTree<K, V, C>(tree);
    }

    selectFeatures(features: Feature<K, V>[]) {
        return features;
    }

    train(data: TrainingData<K, V, C>, metaData: TreeMetaData<K, V, C>) {
        return new DecisionTree<K, V, C>({
            fork: this.trainFork(data, metaData),
        });
    }

    processFeatureMetaData(data: TrainingData<K, V, C>) {
        const featureValues = new Map<K, Set<V>>();
        const scalarFeatures = new Set<K>();
        const categoricalFeatures = new Set<K>();
        for (const [features, ] of data)
            for (const [feature, value] of features) {
                featureValues.set(feature, (featureValues.get(feature) || new Set()).add(value));
                if (typeof value === "number" || typeof value === "bigint")
                    scalarFeatures.add(feature);
                else
                    categoricalFeatures.add(feature);
            }
        const features: Feature<K, V>[] = [];
        for (const [key, values] of featureValues) {
            const scalar = scalarFeatures.has(key);
            const categorical = categoricalFeatures.has(key);
            let feature: Feature<K, V>;
            if (scalar && !categorical) {
                const iterator = values.values();
                const first = iterator.next().value as number;
                let min = first;
                let max = first;
                let next: IteratorResult<V, V>;
                let sum = 0;
                let count = 0;
                while (!(next = iterator.next()).done) {
                    const nextNumber = next.value as any as number;
                    if (nextNumber > max) max = nextNumber;
                    if (nextNumber < max) min = nextNumber;
                    sum += nextNumber;
                    ++count;
                }
                const mean = sum / count;
                feature = new Scalar({ min, max, mean, key }) as any as Feature<K, V>;
            } else
                feature = new Categorical({ values: values, key })
            features.push(feature);
        }

        return features;
    }

    /**
     * @param data     the rows of data at a given node in the decision tree, as
     *                 a map of features to values.
     * @param metaData a map of features to the values those features may take,
     *                 along with a list of valid categories.
     */
    private trainFork(data: TrainingData<K, V, C>, metaData: TreeMetaData<K, V, C>) {
        let fork: Fork;
        if (metaData.depth === 0)
            fork = new Leaf({ category: DecisionTree.maxCategory(data, ([, c]) => c) });
        else if (DecisionTree.categoryCount(data, ([, category]) => category) === 1)
            fork = new Leaf({ category: data[0][1] });
        else {
            if (!metaData.categories) metaData.categories = [...new Set(data.map(([, category]) => category))];
            if (!metaData.depth) metaData.depth = DecisionTree.DEFAULT_DEPTH;
            if (!metaData.features) metaData.features = this.processFeatureMetaData(data);
            let feature: Feature<K, V>, preFork: PotentialFork<K, V, C>;
            let minScore = 1;
            const useless = new Set<K>()
            for (const candidateFeature of this.selectFeatures(metaData.features)) {
                const candidateFork = candidateFeature.bestSplit(data);
                if (candidateFork) {
                    let featureImpurity = 0;
                    for (const split of candidateFork.branches) {
                        const countIterator = DecisionTree.countCategoriesUnlabelled(split, row => row[1]);
                        const splitImpurity = DecisionTree.giniImpurity(countIterator);
                        const splitWeight = split.length / data.length;
                        featureImpurity += splitImpurity * splitWeight;
                    }
                    if (featureImpurity < minScore)
                        [minScore, feature, preFork] = [featureImpurity, candidateFeature, candidateFork];
                } else  {
                    useless.add(candidateFeature.key);
                }
            }
            if (feature) {
                console.log(feature, minScore, preFork.branches.map(b => b.length));
                const nextMetaData = {
                    ...metaData,
                    features: metaData.features.filter(f => !useless.has(f.key)),
                    depth: metaData.depth - 1,
                };
                switch (preFork.type) {
                    case ForkType.CATEGORICAL:
                        const keys = preFork.conditionalData as V[];
                        const branches =
                            new Map(keys.map((k, i) => [k, this.trainFork(preFork.branches[i], nextMetaData)]));
                        fork = new CategoricalFork<K, V, C>({
                            feature: feature.key,
                            branches,
                        });
                        break;
                    case ForkType.SCALAR:
                        const [left, right, unlabelled] =
                            preFork.branches.map(branch => this.trainFork(branch, nextMetaData));
                        fork = new ScalarFork<K, number, C>({
                            feature: feature.key,
                            left,
                            right,
                            unlabelled,
                            pivot: preFork.conditionalData as number,
                        });
                        break;
                }
            } else
                fork = new Leaf({ category: DecisionTree.maxCategory(data, ([, c]) => c) });
        }

        return fork;
    }

    toJSON() {
        return { fork: this.fork.toJSON() }
    }

    // https://en.wikipedia.org/wiki/Decision_tree_learning#Gini_impurity
    static giniImpurity(categoryCounts: IterableIterator<number>) {
        let total = 0;
        let sum = 0;
        for (const count of categoryCounts) {
            total += count;
            sum += count ** 2;
        } 

        return 1 - sum / total ** 2;
    }
}