import { GenericConstructor } from "types/GenericConstructor";
import { Leaf } from "../forks/Leaf";
import { TreeTrainingArgs } from "../args/TreeTrainingArgs";
import { Fork } from "../forks/Fork";
import { NonLeaf } from "../forks/NonLeaf";
import { CategoricalFork } from "../forks/CategoricalFork";
import { Feature } from "../../features/Feature";
import { Scalar } from "../../features/Scalar";
import { Categorical } from "../../features/Categorical";
import { ForkType } from "../forks/ForkType";
import { ScalarFork } from "../forks/ScalarFork";
import { TrainingData } from "../../../TrainingData";
import { ScoredPotentialFork } from "../ScoredPotentialFork";
import { fancyLog } from "utils/alpha";
import { ClassifierType } from "ml/classifiers/ClassifierType";
import { CompactCTree } from "../forests/AdaBoost";
import { TrainingFile } from "ml/classifiers/TrainingFile";

export class DecisionTree<K> extends GenericConstructor<DecisionTree<K>> {
    static readonly DEFAULT_DEPTH = 20;

    readonly fork: Fork;
    
    classify(features: Map<K, number>) {
        let fork = this.fork;
        let parent: typeof fork = null
        while (fork instanceof NonLeaf) {
            parent = fork;
            fork = fork.next(features);
        }

        return (fork as Leaf).label;
    }

    static categoryCount<C>(categories: C[]) {
        return new Set(categories).size;
    }

    static maxCategory<K>(data: TrainingData<K>) {
        const weights = [0, 0];
        for (let i = 0; i < data.length; ++i) {
            const label = data.labels[i]
            const weight = data.weights[i]
            weights[label] += weight;
        }
        return weights[0] > weights[1] ? 0 : 1;
    }

    parse(arg: Buffer | any) {
        let tree: any;
        if (arg instanceof Buffer)
            tree = JSON.parse(arg.toString());
        else tree = arg;
        const fork = Fork.parse(tree.fork);

        return new DecisionTree<K>({ fork });
    }

    selectFeatures(features: Feature<K>[]) {
        return features;
    }

    train(args: TreeTrainingArgs<K>) {
        return new DecisionTree<K>({
            fork: this.trainFork(args),
        });
    }

    static processFeatureMetaData<K>(data: TrainingData<K>) {
        const featureValues = new Map<K, Set<number>>();
        const scalarFeatures = new Set<K>();
        const categoricalFeatures = new Set<K>();
        const featureMatrix = new Map<K, number[]>();
        for (let i = 0; i < data.length; ++i) {
            const features = data.features[i];
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
            if (occurrences.length > 2) {
                const scalar = scalarFeatures.has(key);
                const categorical = categoricalFeatures.has(key);
                let feature: Feature<K>;
                if (scalar) {
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
        }
        fancyLog(`${features.length} features extracted.`);

        return features;
    }

    bestFork(args: TreeTrainingArgs<K>) {
        const data = args.data;
        let feature: Feature<K> = null;
        let preFork: ScoredPotentialFork<K>;
        let minScore = 1;
        const useless = new Set<K>()
        const selectedFeatures = this.selectFeatures(args.features);
        let i = 0;
        for (const candidateFeature of selectedFeatures) {
            //process.stdout.write(`\r             \r${++i} / ${selectedFeatures.length}`);
            let candidateFork: ScoredPotentialFork<K>;
            if (args.depth === 1)
                candidateFork = candidateFeature.bestFinalSplit(data);
            else
                candidateFork = candidateFeature.bestSplit(data);
            if (candidateFork) {
                if (candidateFork.score < minScore) {
                    [minScore, feature, preFork] = [candidateFork.score, candidateFeature, candidateFork];
                    //console.log();
                    //console.log(feature.key, minScore, ForkType[(preFork.conditionalData as Fork).type()]);
                }
            } else  {
                useless.add(candidateFeature.key);
            }
        }
        //console.log();

        return { feature, preFork, useless };
    }

    /**
     * @param data     the rows of data at a given node in the decision tree, as
     *                 a map of features to values.
     * @param args a map of features to the values those features may take,
     *                 along with a list of valid categories.
     */
    private trainFork(args: TreeTrainingArgs<K>) {
        const data = args.data;
        let fork: Fork;
        if (args.depth === 0) {
            const category = DecisionTree.maxCategory(data);
            fork = new Leaf({ label: category });
        } else if (DecisionTree.categoryCount(data.labels) === 1)
            fork = new Leaf({ label: data.labels[0] });
        else {
            if (!args.depth) args.depth = DecisionTree.DEFAULT_DEPTH;
            if (!args.features) args.features = DecisionTree.processFeatureMetaData(data);
            let { feature, preFork, useless } = this.bestFork(args);
            if (feature) {
                //console.log(feature, preFork.branches.map(b => b.length));
                if (preFork.type === ForkType.FINAL) {
                    fork = preFork.conditionalData as Fork;
                } else {
                    const nextFeatures = args.features.filter(f => !useless.has(f.key));
                    const [leftSplit, rightSplit] = preFork.branches;
                    const nextDepth = args.depth - 1;
                    const leftArgs = { ...args, features: nextFeatures, depth: nextDepth, data: leftSplit };
                    const rightArgs = { ...args, features: nextFeatures, depth: nextDepth, data: rightSplit };
                    const left = this.trainFork(leftArgs);
                    const right = this.trainFork(rightArgs);
                    if (left instanceof Leaf && right instanceof Leaf && left.label === right.label) {
                        fork = new Leaf({ label: left.label });
                    } else {
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
                }
            } else
                fork = new Leaf({ label: DecisionTree.maxCategory(data) });
        }

        return fork;
    }

    toJSON() {
        return {
            fork: this.fork.toJSON(),
            type: ClassifierType.DECISION_TREE,
        }
    }

    static fromCJSON(cTree: CompactCTree, file: TrainingFile) {
        const fork = Fork.fromCJSON(cTree, file);

        return new DecisionTree({ fork });
    }
}