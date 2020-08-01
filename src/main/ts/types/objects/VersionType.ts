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

    static RAW_HTML_FILE = "raw.html";
    static RAW_HTML = new VersionType({ filename: VersionType.RAW_HTML_FILE });
    static RAW_ZIP_FILE = "raw.zip";
    static RAW_ZIP = new VersionType({ filename: VersionType.RAW_ZIP_FILE });
    static WORD_EMBEDDINGS_FILE = "word-embeddings.bin";
    static WORD_EMBEDDINGS = new VersionType({ filename: VersionType.WORD_EMBEDDINGS_FILE});
    static RAW_WORDS_TXT_FILE = "raw-words.txt";
    static RAW_WORDS_TXT = new VersionType({ filename: VersionType.RAW_WORDS_TXT_FILE });
    static RAW_LINKS_TXT_FILE = "raw-links.txt";
    static RAW_LINKS_TXT = new VersionType({ filename: VersionType.RAW_LINKS_TXT_FILE });
    static WORD_HITS_FILE = "word-hits.bin";
    static WORD_HITS = new VersionType({ filename: VersionType.WORD_HITS_FILE });
    static LINK_HITS_FILE = "link-hits.bin";
    static LINK_HITS = new VersionType({ filename: VersionType.LINK_HITS_FILE });
    static RAW_HEADERS_FILE = "headers.txt";
    static RAW_HEADERS = new VersionType({ filename: VersionType.RAW_HEADERS_FILE });
    static TITLE_FILE = "title.txt";
    static TITLE = new VersionType({ filename: VersionType.TITLE_FILE });
    static WIKI_TREE_FILE = "wiki-tree.txt";
    static WIKI_TREE = new VersionType({ filename: VersionType.WIKI_TREE_FILE });
    static BAG_OF_WORDS_FILE = "bow.bin";
    static BAG_OF_WORDS = new VersionType({ filename: VersionType.BAG_OF_WORDS_FILE });
    static BINARY_BAG_OF_WORDS_FILE = "bin-bow.bin";
    static BINARY_BAG_OF_WORDS = new VersionType({ filename: VersionType.BINARY_BAG_OF_WORDS_FILE });
}
