export abstract class FeatureBuilder<S, K> {
    abstract async build(source: S): Promise<Map<K, number>>;
}