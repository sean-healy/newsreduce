import { Hits } from "./Hits";
import { Word } from "./objects/Word";
import { HitList } from "./HitList";

export class WordHits extends Hits<Word> {
    constructor(hits: Map<bigint, HitList> = new Map()) {
        super(value => new Word(value), 2, hits);
    }
    build(hits: Map<bigint, HitList>) {
        return new WordHits(hits);
    }
}
