import { HitType } from "types/HitType";

export class Hit {
    prominentHTMLTag: HitType;
    // Portion of the document in which the word occurs (0 - 15).
    relativePositionInDocument: number;

    constructor(prominentHTMLTag: HitType, relativePositionInDocument: number) {
        this.prominentHTMLTag = prominentHTMLTag;
        this.relativePositionInDocument = relativePositionInDocument;
    }

    toByte() {
        return ((this.prominentHTMLTag << 4) | this.relativePositionInDocument);
    }
    static fromByte(byte: number) {
        const prominentHTMLTag = byte >> 4;
        const relativePositionInDocument = byte & 0b1111;

        return new Hit(prominentHTMLTag, relativePositionInDocument);
    }
}
