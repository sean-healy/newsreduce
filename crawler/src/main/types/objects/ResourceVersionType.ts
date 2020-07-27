import { DBObject } from "types/DBObject";

type ConstructorParam = string | { [key in keyof ResourceVersionType]?: ResourceVersionType[key] }

export class ResourceVersionType extends DBObject<ResourceVersionType> {
    static RAW_HTML_FILE = "raw.html";
    static RAW_HEADERS_FILE = "headers.txt";
    static RAW_WORDS_TXT_FILE = "raw-words.txt";
    static RAW_LINKS_TXT_FILE = "raw-links.txt";
    static WORD_HITS_FILE = "word-hits.bin";
    static LINK_HITS_FILE = "link-hits.bin";
    static TITLE_FILE = "title.txt";

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
        return "ResourceVersionType";
    }
    hashSuffix(): string {
        return this.filename;
    }

    static RAW_HTML = new ResourceVersionType({
        filename: ResourceVersionType.RAW_HTML_FILE,
    });
    static RAW_WORDS_TXT = new ResourceVersionType({
        filename: ResourceVersionType.RAW_WORDS_TXT_FILE,
    });
    static RAW_LINKS_TXT = new ResourceVersionType({
        filename: ResourceVersionType.RAW_LINKS_TXT_FILE,
    });
    static WORD_HITS = new ResourceVersionType({
        filename: ResourceVersionType.WORD_HITS_FILE,
    });
    static LINK_HITS = new ResourceVersionType({
        filename: ResourceVersionType.LINK_HITS_FILE,
    });
    static RAW_HEADERS = new ResourceVersionType({
        filename: ResourceVersionType.RAW_HEADERS_FILE,
    });
    static TITLE = new ResourceVersionType({
        filename: ResourceVersionType.TITLE_FILE,
    });
}
