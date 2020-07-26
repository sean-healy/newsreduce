export enum FileFormat {
    RAW_HTML,
    RAW_HEADERS,
    RAW_WORDS_TXT,
    RAW_LINKS_TXT,
    WORD_HITS,
    LINK_HITS,
    UNKNOWN,
}

export const RAW_HTML_FILE = "raw.html";
export const RAW_HEADERS_FILE = "headers.txt";
export const RAW_WORDS_TXT_FILE = "raw-words.txt";
export const RAW_LINKS_TXT_FILE = "raw-links.txt";
export const WORD_HITS_FILE = "word-hits.bin";
export const LINK_HITS_FILE = "link-hits.bin";

export function formatToFileName(format: FileFormat) {
    switch (format) {
        case FileFormat.RAW_HTML: return RAW_HTML_FILE;
        case FileFormat.RAW_HEADERS: return RAW_HEADERS_FILE;
        case FileFormat.RAW_WORDS_TXT: return RAW_WORDS_TXT_FILE;
        case FileFormat.RAW_LINKS_TXT: return RAW_LINKS_TXT_FILE;
        case FileFormat.WORD_HITS: return WORD_HITS_FILE;
        case FileFormat.LINK_HITS: return LINK_HITS_FILE;
        default: throw `format not handled: ${format}`;
    }
}

export function fileNameToFormat(fileName: string) {
    switch (fileName) {
        case RAW_HTML_FILE: return FileFormat.RAW_HTML;
        case RAW_HEADERS_FILE: return FileFormat.RAW_HEADERS;
        case RAW_WORDS_TXT_FILE: return FileFormat.RAW_WORDS_TXT;
        case RAW_LINKS_TXT_FILE: return FileFormat.RAW_LINKS_TXT;
        case WORD_HITS_FILE: return FileFormat.WORD_HITS;
        case LINK_HITS_FILE: return FileFormat.LINK_HITS;
        default: return FileFormat.UNKNOWN;
    }
}
