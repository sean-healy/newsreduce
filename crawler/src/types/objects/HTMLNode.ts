import { DBObject } from "types/DBObject";
import { HTMLTag } from "types/objects/HTMLTag";

export class HTMLNode extends DBObject<HTMLNode> {
    readonly tag: HTMLTag;
    readonly attributes: { [key: string]: string };

    hashPrefix(): string {
        return "html-node";
    }
    hashSuffix(): string {
        const attributes = Object
            .keys(this.attributes)
            .sort()
            .map(key => `${key}\0${this.attributes[key]}`)
            .join("\0");

        return `${this.tag}\0${attributes}`;
    }
    insertCols(): string[] {
        return ["id", "tag"];
    }
    getInsertParams(): any[] {
        return [this.getID(), this.tag];
    }
    table(): string {
        return "HTMLNode";
    }
}
