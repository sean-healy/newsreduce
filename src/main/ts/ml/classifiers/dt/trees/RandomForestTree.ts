import { DecisionTree } from "./DecisionTree";
import { Feature } from "../../features/Feature";

export class RandomForestTree<K> extends DecisionTree<K> {
    selectFeatures(features: Feature<K>[]) {
        const featureCount = features.length;
        const featureSelectLimit = Math.ceil(featureCount ** 0.5);
        const randomFeatureSelectionIndex = new Set<number>();
        const randomFeatureSelection = new Array<Feature<K>>(featureSelectLimit);
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