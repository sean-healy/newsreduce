import { DBObject } from "../DBObject";
import { HTMLTag } from "./HTMLTag";

export class HTMLNode extends DBObject<HTMLNode> {
    tag: HTMLTag;
    attributes: { [key: string]: string };

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
    getInsertStatement(): string {
        return `insert ignore into HTMLNode(id, tag) values ? `
    }
    getInsertParams(): any[] {
        return [this.getID(), this.tag];
    }
    table(): string {
        return "HTMLNode";
    }
}
