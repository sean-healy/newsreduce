import { SimpleHashObject } from "./SimpleHashObject";

export class Key extends SimpleHashObject<Key> {
    table(): string {
        return "Key";
    }

    static readonly WIKI_NEWS_SOURCE_HOMEPAGE = new Key("wiki-news-source-homepage");
}
