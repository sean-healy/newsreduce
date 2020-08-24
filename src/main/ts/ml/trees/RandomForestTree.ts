import { DecisionTree } from "./DecisionTree";
import { Feature } from "./Feature";

export class RandomForestTree<K, V, C> extends DecisionTree<K, V, C> {
    selectFeatures(features: Feature<K, V>[]) {
        const featureCount = features.length;
        const featureSelectLimit = Math.ceil(Math.sqrt(featureCount));
        const randomFeatureSelectionIndex = new Set<number>();
        const randomFeatureSelection = new Array<Feature<K, V>>(featureSelectLimit);
        for (let i = 0; i < featureSelectLimit; ++i) {
            let selectedFeatureIndex: number;
            for (
                selectedFeatureIndex = Math.floor(Math.random() * featureCount);
                randomFeatureSelectionIndex.has(selectedFeatureIndex);
                selectedFeatureIndex = (selectedFeatureIndex + 1) % featureCount);
            randomFeatureSelection[i] = features[selectedFeatureIndex];
            randomFeatureSelectionIndex.add(selectedFeatureIndex);
        }

        return randomFeatureSelection;
    }

}