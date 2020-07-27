import { DBObject } from "types/DBObject";

export const RAW_HTML_FILE = "raw.html";
export const RAW_HEADERS_FILE = "headers.txt";
export const RAW_WORDS_TXT_FILE = "raw-words.txt";
export const RAW_LINKS_TXT_FILE = "raw-links.txt";
export const WORD_HITS_FILE = "word-hits.bin";
export const LINK_HITS_FILE = "link-hits.bin";
export const TITLE_FILE = "title.txt";

type ConstructorParam = string | { [key in keyof ResourceVersionType]?: ResourceVersionType[key] }

export class ResourceVersionType extends DBObject<ResourceVersionType> {
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
        filename: RAW_HTML_FILE,
    });
    static RAW_WORDS_TXT = new ResourceVersionType({
        filename: RAW_WORDS_TXT_FILE,
    });
    static RAW_LINKS_TXT = new ResourceVersionType({
        filename: RAW_LINKS_TXT_FILE,
    });
    static WORD_HITS = new ResourceVersionType({
        filename: WORD_HITS_FILE,
    });
    static LINK_HITS = new ResourceVersionType({
        filename: LINK_HITS_FILE,
    });
    static RAW_HEADERS = new ResourceVersionType({
        filename: RAW_HEADERS_FILE,
    });
    static TITLE = new ResourceVersionType({
        filename: TITLE_FILE,
    });
}
