export enum HitType {
    TITLE,
    H1,
    H2,
    H3,
    H4,
    H5,
    H6,
    FIGCAPTION,
    STRONG,
    A,
    EM,
    BLOCKQUOTE,
    P,
    OTHER_TEXT,
    ACCESSABILITY_DATA,
    META_DATA,
};

const META_NAMES_CONSIDERED = [
    "description",
    "author",
    "keywords",
];

export function nodeToHitType(node: Element) {
    let hitType: HitType;
    switch (node.tagName) {
        case "TITLE":
            hitType = HitType.TITLE;
            break;
        case "H1":
            hitType = HitType.H1;
            break;
        case "H2":
            hitType = HitType.H2;
            break;
        case "H3":
            hitType = HitType.H3;
            break;
        case "H4":
            hitType = HitType.H4;
            break;
        case "H5":
            hitType = HitType.H5;
            break;
        case "H6":
            hitType = HitType.H6;
            break;
        case "FIGCAPTION":
            hitType = HitType.FIGCAPTION;
            break;
        case "STRONG":
        case "B":
            hitType = HitType.STRONG;
            break;
        case "EM":
        case "I":
            hitType = HitType.EM;
            break;
        case "BLOCKQUOTE":
            hitType = HitType.BLOCKQUOTE;
            break;
        case "A":
            hitType = HitType.A;
            break;
        case "P":
            hitType = HitType.P;
            break;
        case "META":
            const name = node.getAttribute("name");
            if (name) {
                if (name in META_NAMES_CONSIDERED) {
                    hitType = HitType.META_DATA;
                } else {
                    hitType = HitType.OTHER_TEXT;
                }
            } else {
                const name = node.getAttribute("property");
                if (name in META_NAMES_CONSIDERED) {
                    hitType = HitType.META_DATA;
                } else {
                    hitType = HitType.OTHER_TEXT;
                }
            }
            break;
        default:
            if (node.hasAttribute("title") || node.hasAttribute("alt"))
                hitType = HitType.ACCESSABILITY_DATA;
            else
                hitType = HitType.OTHER_TEXT;
    }

    return hitType;
}
