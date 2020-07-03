export enum FileFormat {
    RAW_HTML,
    RAW_TXT,
    HITS,
}

export function formatToFileName(format: FileFormat) {
    switch (format) {
        case FileFormat.RAW_HTML: return "raw.html";
        case FileFormat.RAW_TXT: return "raw.txt";
        case FileFormat.HITS: return "hit.bin";
        default: throw `format not handled: ${format}`;
    }
}

export function fileNameToFormat(fileName: string) {
    switch (fileName) {
        case "raw.html": return FileFormat.RAW_HTML;
        case "raw.txt": return FileFormat.RAW_TXT;
        case "hit.bin": return FileFormat.HITS;
        default: throw `file name not handled: ${fileName}`;
    }
}
