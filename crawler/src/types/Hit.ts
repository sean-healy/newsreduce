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
}
