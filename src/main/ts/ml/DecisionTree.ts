import { GenericConstructor } from "types/GenericConstructor";
import { fancyLog, Dictionary } from "common/util";

interface MetaData<C, K = any, V = any> {
    features: Map<K, V[]>;
    defaultValues: Map<K, V>;
    categories: C[];
    previouslyUsedFeatures: K[];
}
abstract class Node<N extends Node<N>> extends GenericConstructor<N> {
    abstract isLeaf(): boolean;
}
class Leaf<C> extends Node<Leaf<C>> {
    readonly isLeaf = () => true;
    readonly category: C;
}
class Branch<K, V, C> extends Node<Branch<K, V, C>> {
    readonly isLeaf = () => false;
    subTree: Tree<K, V, C>;
}
interface Tree<K, V, C> {
    feature: K;
    branches: Map<V, Node<Leaf<C> | Branch<K, V, C>>>;
}
export type TrainingDataPoint<K, V, C> = [Map<K, V>, C];
export type TrainingData<K, V, C> = TrainingDataPoint<K, V, C>[];
/**
 * @type K the data type used for feature keys (e.g. functor names in a predicate logic system.)
 * @type V the data type used for feature values (e.g. booleans for pred. logic, strings for categorical data.)
 * @type C the data type used for category labels, e.g. strings ("sport", "weather", "tech", etc.), booleans
 *         in simple YES/NO categories (e.g. spam filtering).
 */
export class DecisionTree<K, V, C> extends GenericConstructor<DecisionTree<K, V, C>> {
    tree: Tree<K, V, C>;

    classify(
        features: Map<K, V>,
        getDefaultValue: (feature: K) => V = _ => null,
    ) {
        let tree: Tree<K, V, C> = this.tree;
        let node: Node<Leaf<C> | Branch<K, V, C>>;
        while (true) {
            let value = features.get(tree.feature);
            if (!value) value = getDefaultValue(tree.feature);
            node = tree.branches.get(value);
            if (node.isLeaf()) break;
            tree = (node as Branch<K, V, C>).subTree;
        }

        return (node as Leaf<C>).category;
    }

    toJSON() {
        const branches = {};
        for (const [key, val] of this.tree.branches.entries()) {
            branches[`${key}`] = val.isLeaf() ?
                (val as Leaf<V>).category : new DecisionTree({ tree: (val as Branch<K, V, C>).subTree }).toJSON();
        }

        return {
            feature: this.tree.feature,
            branches,
        }
    }

    static build<K, V, C>(
        data: TrainingData<K, V, C>,
        getDefaultValue: (feature: K) => V = _ => null,
        randomForest = false,
        maxDepth = 20,
    ) {
        const features: Map<K, Set<V>> = new Map();
        const categories: Set<C> = new Set();
        for (const [rowFeatures, category] of data) {
            categories.add(category);
            for (const [key, value] of rowFeatures) {
                let values = features.get(key);
                if (!values) {
                    values = new Set();
                    features.set(key, values);
                }
                values.add(value);
            }
        }
        fancyLog(`${features.size} total features.`);
        const metaData: MetaData<C, K, V> = {
            features: new Map([...features.entries()].map(([key, values]) => {
                const entry: [K, V[]] = [key, [...values]];

                return entry;
            })),
            defaultValues: new Map([...features.keys()].map(f => [f, getDefaultValue(f)])),
            categories: [...categories],
            previouslyUsedFeatures: [],
        }
        let tree: Tree<K, V, C>;
        if (randomForest)
            tree = DecisionTree.buildRandomForestTree(data, metaData, maxDepth);
        else
            tree = DecisionTree.buildTree(data, metaData, maxDepth) as Tree<K, V, C>;

        return new DecisionTree({ tree });
    }

    // https://en.wikipedia.org/wiki/Decision_tree_learning#Gini_impurity
    static giniImpurity(categoryCounts: number[]) {
        const total = categoryCounts.reduce((a, b) => a + b);
        let sum = 0;
        for (const count of categoryCounts) {
            const p = count / total;
            sum += p ** 2;
        }

        return 1 - sum;
    }

    /**
     * @param data    the data to split
     * @param feature the feature by which the data can be split.
     * 
     * @return the data, split by various values of the feature.
     *         This happens to be stored in a map structure of
     *         feature values to arrays.
     */
    static split<K, V, C>(data: [Map<K, V>, C][], feature: K, defaultValue: V) {
        const splitData = new Map<V, typeof data>();
        for (const row of data) {
            const [features, ] = row;
            const value = features.get(feature) || defaultValue;
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

    /**
     * @param data     the rows of data at a given node in the decision tree, as
     *                 a map of features to values.
     * @param metaData a map of features to the values those features may take,
     *                 along with a list of valid categories.
     */
    static buildTree<K, V, C>(
        data: [Map<K, V>, C][],
        metaData: MetaData<C, K, V>,
        maxDepth: number,
    ) : Tree<K, V, C> {
        const totalDataPoints = data.length;
        let minFeature: K;
        let minSplit: Map<V, [Map<K, V>, C][]> = new Map();
        let minScore = 1;
        let minLeaves: Set<V> = new Set();
        const usedFeatures: K[] = [];
        for (const [feature, ] of metaData.features) {
            if (metaData.previouslyUsedFeatures.includes(feature)) continue;
            const splitData = DecisionTree.split<K, V, C>(data, feature, metaData.defaultValues.get(feature));
            if (splitData.size <= 1) {
                usedFeatures.push(feature);
                continue;
            }
            let featureImpurity = 0;
            const leaves: Set<V> = new Set();
            for (const [value, split] of splitData) {
                const splitDataPoints = split.length;
                const splitWeight = splitDataPoints / totalDataPoints;
                const categoryCounts = DecisionTree.countCategories(split, row => row[1]);
                if (categoryCounts.size === 1)
                    leaves.add(value);
                else {
                    const categoryCountArray = [...categoryCounts.values()];
                    const impurity = DecisionTree.giniImpurity(categoryCountArray);
                    featureImpurity += impurity * splitWeight;
                }
            }
            if (featureImpurity <= minScore) {
                minScore = featureImpurity;
                minSplit = splitData;
                minLeaves = leaves;
                minFeature = feature;
            }
        }
        if (!minFeature)
            return null;
        /*
        for (let i = 0; i < maxDepth; ++i) process.stdout.write("  ");
        console.log(`Feature: ${minFeature}`);
        for (let i = 0; i < maxDepth; ++i) process.stdout.write("  ");
        if (minSplit.has(false as any))
        console.log(`Left: ${minSplit.get(false as any).length}`);
        for (let i = 0; i < maxDepth; ++i) process.stdout.write("  ");
        if (minSplit.has(true as any))
        console.log(`Right: ${minSplit.get(true as any).length}`);
        if (minSplit.size === 0) {
            console.log(data);
        }
        for (let i = 0; i < maxDepth; ++i) process.stdout.write("  ");
        console.log(`Impurity: ${minScore}`);
        */
        const branches = new Map<V, Node<Leaf<C> | Branch<K, V, C>>>();
        const nextMetaData = {
            ...metaData,
            previouslyUsedFeatures: [...metaData.previouslyUsedFeatures, minFeature, ...usedFeatures],
        };
        for (const [value, split] of minSplit) {
            let node: Node<Leaf<C> | Branch<K, V, C>>;
            if (minLeaves.has(value))
                node = new Leaf({ category: split[0][1] });
            else if (maxDepth === 1)
                node = new Leaf({ category: DecisionTree.maxCategory(split, ([, c]) => c) });
            else {
                const subTree = DecisionTree.buildTree(split, nextMetaData, maxDepth - 1);
                if (subTree)
                    node = new Branch({ subTree });
                else
                    node = new Leaf({ category: DecisionTree.maxCategory(split, ([, c]) => c) });
            }
            branches.set(value, node);
        }
        const feature = minFeature;
        const tree = { feature, branches }

        return tree;
    }

    /**
     * @param data     the rows of data at a given node in the decision tree, as
     *                 a map of features to values.
     * @param metaData a map of features to the values those features may take,
     *                 along with a list of valid categories.
     */
    static buildRandomForestTree<K, V, C>(
        data: [Map<K, V>, C][],
        metaData: MetaData<C, K, V>,
        maxDepth: number,
    ) : Tree<K, V, C> {
        const totalDataPoints = data.length;
        let minFeature: K;
        let minSplit: Map<V, [Map<K, V>, C][]> = new Map();
        let minScore = 1;
        let minLeaves: Set<V> = new Set();
        const usedFeatures: K[] = [];
        const featureKeys = [...metaData.features.keys()];
        const featureCount = featureKeys.length;
        const featureSelectLimit = Math.ceil(Math.sqrt(featureCount));
        const randomFeatureSelectionIndex = new Set<number>();
        const randomFeatureSelection = new Map<K, V[]>();
        for (let i = 0; i < featureSelectLimit; ++i) {
            let selectedFeatureIndex: number;
            for (
                selectedFeatureIndex = Math.floor(Math.random() * featureCount);
                randomFeatureSelectionIndex.has(selectedFeatureIndex);
                selectedFeatureIndex = (selectedFeatureIndex + 1) % featureCount);
            const selectedFeatureKey = featureKeys[selectedFeatureIndex];
            randomFeatureSelection.set(selectedFeatureKey, metaData.features.get(selectedFeatureKey));
            randomFeatureSelectionIndex.add(selectedFeatureIndex);
        }
        for (const [feature, ] of randomFeatureSelection) {
            if (metaData.previouslyUsedFeatures.includes(feature)) continue;
            const splitData = DecisionTree.split<K, V, C>(data, feature, metaData.defaultValues.get(feature));
            if (splitData.size <= 1) {
                usedFeatures.push(feature);
                continue;
            }
            let featureImpurity = 0;
            const leaves: Set<V> = new Set();
            for (const [value, split] of splitData) {
                const splitDataPoints = split.length;
                const splitWeight = splitDataPoints / totalDataPoints;
                const categoryCounts = DecisionTree.countCategories(split, row => row[1]);
                if (categoryCounts.size === 1)
                    leaves.add(value);
                else {
                    const categoryCountArray = [...categoryCounts.values()];
                    const impurity = DecisionTree.giniImpurity(categoryCountArray);
                    featureImpurity += impurity * splitWeight;
                }
            }
            if (featureImpurity <= minScore) {
                minScore = featureImpurity;
                minSplit = splitData;
                minLeaves = leaves;
                minFeature = feature;
            }
        }
        if (!minFeature)
            return null;
        const branches = new Map<V, Node<Leaf<C> | Branch<K, V, C>>>();
        const nextMetaData = {
            ...metaData,
            previouslyUsedFeatures: [...metaData.previouslyUsedFeatures, minFeature, ...usedFeatures],
        };
        let firstCategory: C = null;
        let validLeaf = false;
        for (const [value, split] of minSplit) {
            let node: Node<Leaf<C> | Branch<K, V, C>>;
            let category: C = null;
            if (minLeaves.has(value)) {
                category = DecisionTree.maxCategory(split, ([, c]) => c);
                node = new Leaf({ category: split[0][1] });
            } else if (maxDepth === 1) {
                category = DecisionTree.maxCategory(split, ([, c]) => c);
                node = new Leaf({ category });
            } else {
                const subTree = DecisionTree.buildRandomForestTree(split, nextMetaData, maxDepth - 1);
                if (subTree) node = new Branch({ subTree });
                else {
                    category = DecisionTree.maxCategory(split, ([, c]) => c);
                    node = new Leaf({ category });
                }
            }
            branches.set(value, node);
            if (!validLeaf) {
                if (category === null) {
                    validLeaf = true;
                } else if (firstCategory === null) {
                    firstCategory = category;
                } else if (category !== firstCategory) {
                    validLeaf = true;
                }
            }
        }
        if (!validLeaf) return null;
        const feature = minFeature;
        const tree = { feature, branches }

        return tree;
    }

    static parseRandomForestTree<K, V, C>(tree: any) {
        const parsedBranches = new Map();
        for (let key in tree.branches) {
            const node = tree.branches[key];
            let anyKey: any = key;
            if (anyKey === "true") anyKey = true;
            else if (anyKey === "false") anyKey = false;
            let value: any;
            if (typeof node === "object")
                value = new Branch({ subTree: this.parseRandomForestTree(node) });
            else if (node === "true")
                value = new Leaf({ category: true });
            else if (node === "false")
                value = new Leaf({ category: false });
            else
                value = new Leaf({ category: node });
            parsedBranches.set(anyKey, value);
        }
        tree.branches = parsedBranches;

        return tree as Tree<K, V, C>;
    }

    static parseRandomForest<K, V, C>(forest: Buffer) {
        const treeStrs = forest.toString().split(/\n+/g);
        const trees: DecisionTree<K, V, C>[] = [];
        for (const treeStr of treeStrs) {
            const tree = JSON.parse(treeStr);
            this.parseRandomForestTree(tree);
            trees.push(new DecisionTree<K, V, C>({ tree }));
        }

        return trees;
    }
}