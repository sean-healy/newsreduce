import { Hits } from "./Hits";
import { ResourceURL } from "./db-objects/ResourceURL";
import { HitList } from "./HitList";

export class LinkHits extends Hits<ResourceURL> {
    constructor(hits: Map<bigint, HitList> = new Map()) {
        super(value => new ResourceURL(value), 2, hits);
    }
    build(hits: Map<bigint, HitList>) {
        return new LinkHits(hits);
    }
}
