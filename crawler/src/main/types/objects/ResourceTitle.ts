import { DBObject } from "types/DBObject";
import { ResourceURL } from "types/objects/ResourceURL";
import { Title } from "./Title";
import { ConstructorArg0 } from "common/util";

export class ResourceTitle extends DBObject<ResourceTitle> {
    readonly resource: ResourceURL;
    readonly title: Title;

    constructor(urlOrObject?: string | ConstructorArg0<ResourceTitle>, title?: string) {
        if (urlOrObject === null || urlOrObject === undefined) super();
        else if (typeof urlOrObject === "string") super({
            resource: new ResourceURL(urlOrObject),
            title: new Title(title),
        });
        else super(urlOrObject);
    }

    insertCols(): string[] {
        return ["resource", "title"];
    }
    getInsertParams(): any[] {
        return [this.resource.getID(), this.title.getID()];
    }
    table(): string {
        return "ResourceTitle";
    }
    getDeps() {
        return [this.resource, this.title];
    }
}
