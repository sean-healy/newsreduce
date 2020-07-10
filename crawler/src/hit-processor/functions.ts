export function parseHitFile(buffer: Buffer) {
    const words = new Map<bigint, number[]>();
    const bufferLength = buffer.length;
    let offset = 0;
    while (offset < bufferLength) {
        const wordID = buffer.slice(offset, offset + 12).readBigUInt64BE();
        offset += 12;
        const hitsLength = buffer.slice(offset, offset + 2).readUInt16BE();
        offset += 2;
        const hits = new Array(hitsLength);
        for (let i = 0; i < hitsLength; ++i) {
            hits[i] = buffer[offset + i];
        }
        offset += hitsLength;
        words.set(wordID, hits);
    }

    return words;
}
