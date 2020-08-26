import { DBObject } from "types/DBObject";

type ConstructorParam = string | { [key in keyof VersionType]?: VersionType[key] }

export class VersionType extends DBObject<VersionType> {
    readonly filename: string;
    modified: number;

    constructor(arg?: ConstructorParam, modified = 0) {
        if (!arg) super();
        else if (typeof arg === "string") super({ filename: arg, modified });
        else {
            arg.modified = modified;
            super(arg);
        }
    }

    insertCols(): string[] {
        return ["id", "filename", "modified"];
    }
    getInsertParams(): any[] {
        const params = [this.getID(), this.filename, this.modified];

        return params;
    }
    noReplace() {
        return true;
    }
    table(): string {
        return "VersionType";
    }
    hashSuffix(): string {
        return this.filename;
    }

    static RAW_ZIP = new VersionType({ filename: "raw.zip", modified: 0 });

    static RAW_HTML = new VersionType({ filename: "raw.html", modified: 0 });

    static DOCUMENT_VECTOR = new VersionType({ filename: "doc-vec.bin", modified: 0 });

    static WORD_EMBEDDINGS = new VersionType({ filename: "word-embeddings.bin", modified: 0 });

    static RAW_WORDS_TXT = new VersionType({ filename: "raw-words.txt", modified: 0 });

    static TOKENS = new VersionType({ filename: "tokens.txt", modified: 0 });
    // A tokens file, with stop words removed, stemming added, and synonyms replaced.
    static REDUCED_TOKENS = new VersionType({ filename: "min-tokens.txt", modified: 0 });

    static RAW_LINKS_TXT = new VersionType({ filename: "raw-links.txt", modified: 0 });
    static ANCHOR_PATHS = new VersionType({ filename: "anchor-paths.txt", modified: 0 });
    static SUB_DOCS = new VersionType({ filename: "sub-docs.txt", modified: 0 });
    static CLASSIFIED_SUB_DOCS = new VersionType({ filename: "c-sub-docs.txt", modified: 0 });
    static RANDOM_FOREST = new VersionType({ filename: "random-forest.txt", modified: 0 });
    static ADA_BOOST = new VersionType({ filename: "ada-boost.json", modified: 0 });

    static WORD_HITS = new VersionType({ filename: "word-hits.bin", modified: 0 });
    static LINK_HITS = new VersionType({ filename: "link-hits.bin", modified: 0 });

    static RAW_HEADERS = new VersionType({ filename: "headers.txt", modified: 0 });

    static TITLE = new VersionType({ filename: "title.txt", modified: 0 });

    static BAG_OF_LINKS = new VersionType({ filename: "bol.bin", modified: 0 })
    static BINARY_BAG_OF_LINKS = new VersionType({ filename: "bin-bol.bin", modified: 0 })

    static BAG_OF_WORDS = new VersionType({ filename: "bow.bin", modified: 0 });
    static BINARY_BAG_OF_WORDS = new VersionType({ filename: "bin-bow.bin", modified: 0 });

    static BINARY_BAG_OF_GRANULAR_HTML_NODES = new VersionType({ filename: "bin-boh-granular.bin", modified: 0 });
    static BINARY_BAG_OF_VAGUE_HTML_NODES = new VersionType({ filename: "bin-boh-vague.bin", modified: 0 });

    static BAG_OF_BIGRAMS = new VersionType({ filename: "bobg.bin", modified: 0 });
    static BINARY_BAG_OF_BIGRAMS = new VersionType({ filename: "bin-bobg.bin", modified: 0 });

    static BAG_OF_TRIGRAMS = new VersionType({ filename: "botg.bin", modified: 0 });
    static BINARY_BAG_OF_TRIGRAMS = new VersionType({ filename: "bin-botg.bin", modified: 0 });

    static BAG_OF_SKIP_GRAMS = new VersionType({ filename: "bosg.bin", modified: 0 });
    static BINARY_BAG_OF_SKIP_GRAMS = new VersionType({ filename: "bin-bosg.bin", modified: 0 });

    // Same as above, but built from the reduced tokens.

    static REDUCED_BAG_OF_WORDS = new VersionType({ filename: "rbow.bin", modified: 0 });
    static REDUCED_BINARY_BAG_OF_WORDS = new VersionType({ filename: "rbin-bow.bin", modified: 0 });

    static REDUCED_BAG_OF_BIGRAMS = new VersionType({ filename: "rbobg.bin", modified: 0 });
    static REDUCED_BINARY_BAG_OF_BIGRAMS = new VersionType({ filename: "rbin-bobg.bin", modified: 0 });

    static REDUCED_BAG_OF_TRIGRAMS = new VersionType({ filename: "rbotg.bin", modified: 0 });
    static REDUCED_BINARY_BAG_OF_TRIGRAMS = new VersionType({ filename: "rbin-botg.bin", modified: 0 });

    static REDUCED_BAG_OF_SKIP_GRAMS = new VersionType({ filename: "rbosg.bin", modified: 0 });
    static REDUCED_BINARY_BAG_OF_SKIP_GRAMS = new VersionType({ filename: "rbin-bosg.bin", modified: 0 });

    static WIKI_PAGES = new VersionType({ filename: "wiki-pages.bin", modified: 0 });
    static WIKI_CATS = new VersionType({ filename: "wiki-cats.bin", modified: 0 });
    // The below format orders a BOW by counts rather thank by key.  Useful during feature extraction.
    static BAG_OF_WORDS_BY_COUNT = new VersionType({ filename: "bow-by-count.bin", modified: 0 });
    // The below format is similar to the above, but it orders the
    // rows relative to rank across the broader document space.
    // E.g. even if 'the' is infrequent in documents of category C,
    // the row for 'the' will likely be first in this representation.
    // This is useful for feature extraction, as it allows quick comparisons
    // of count.
    static REL_BAG_OF_WORDS = new VersionType({ filename: "rel-bow.bin", modified: 0 });
}
