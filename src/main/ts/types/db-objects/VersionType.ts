import { DBObject } from "types/DBObject";

type ConstructorParam = string | { [key in keyof VersionType]?: VersionType[key] }

export class VersionType extends DBObject<VersionType> {
    readonly filename: string;

    constructor(arg?: ConstructorParam) {
        if (!arg) super();
        else if (typeof arg === "string") super({ filename: arg });
        else super(arg);
    }

    insertCols(): string[] {
        return ["id", "filename"];
    }
    getInsertParams(): any[] {
        const params = [this.getID(), this.filename];

        return params;
    }
    table(): string {
        return "VersionType";
    }
    hashSuffix(): string {
        return this.filename;
    }

    static RAW_HTML = new VersionType({ filename: "raw.html" });
    static RAW_ZIP = new VersionType({ filename: "raw.zip" });
    static WORD_EMBEDDINGS = new VersionType({ filename: "word-embeddings.bin" });
    static RAW_WORDS_TXT = new VersionType({ filename: "raw-words.txt" });
    static TOKENS_TXT = new VersionType({ filename: "tokens.txt" });
    // A tokens file, with stop words removed, stemming added, and synonyms replaced.
    static MINIMAL_TOKENS = new VersionType({ filename: "min-tokens.txt" });
    static RAW_LINKS_TXT = new VersionType({ filename: "raw-links.txt" });
    static ANCHOR_PATHS = new VersionType({ filename: "anchor-paths.txt" });
    static WORD_HITS = new VersionType({ filename: "word-hits.bin" });
    static LINK_HITS = new VersionType({ filename: "link-hits.bin" });
    static RAW_HEADERS = new VersionType({ filename: "headers.txt" });
    static TITLE = new VersionType({ filename: "title.txt" });
    static BAG_OF_WORDS = new VersionType({ filename: "bow.bin" });
    static BINARY_BAG_OF_WORDS = new VersionType({ filename: "bin-bow.bin" });
    static BAG_OF_SKIP_GRAMS = new VersionType({ filename: "bosg.bin" });
    static BINARY_BAG_OF_SKIP_GRAMS = new VersionType({ filename: "bin-bosg.bin" });
    static WIKI_PAGES = new VersionType({ filename: "wiki-pages.bin" });
    static WIKI_CATS = new VersionType({ filename: "wiki-cats.bin" });
    // The below two types are used when partitioning the data for a given class, e.g. 'class: sport'.
    static TRUE_BAG_OF_WORDS = new VersionType({ filename: "true-bow.bin" });
    static FALSE_BAG_OF_WORDS = new VersionType({ filename: "false-bow.bin" });
    // The below format orders a BOW by counts rather thank by key.  Useful during feature extraction.
    static BAG_OF_WORDS_BY_COUNT = new VersionType({ filename: "bow-by-count.bin" });
    // The below format is similar to the above, but it orders the
    // rows relative to rank across the broader document space.
    // E.g. even if 'the' is infrequent in documents of category C,
    // the row for 'the' will likely be first in this representation.
    // This is useful for feature extraction, as it allows quick comparisons
    // of count.
    static REL_BAG_OF_WORDS = new VersionType({ filename: "rel-bow.bin" });
}
