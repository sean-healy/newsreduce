import { Dictionary } from "common/util";
import { DOMPool } from "./DOMPool";
import { ResourceURL } from "types/db-objects/ResourceURL";

const EXCLUDE = [
    "NOSCRIPT",
    "SCRIPT",
    "STYLE",
    "FORM",
    "INPUT",
    "BUTTON",
];

export abstract class ResourceProcessor {
    constructor() { }
    ro() { return true; }
    abstract apply(resource: ResourceURL, input: Dictionary<Buffer | ResourceURL>, time?: number, domPool?: DOMPool, reDOM?: boolean): Promise<void>;
    abstract from(): Set<string>;
    abstract to(): Set<string>;
    resourceMatch(resource: ResourceURL) {
        return true;
    }
    appliesTo(formats: string[], formatsAvailable: string[],resource: ResourceURL) {
        const from = this.from();
        const to = this.to();
        return this.resourceMatch(resource)
            && formatsAvailable.filter(format => from.has(format)).length === from.size
            && formats.filter(format => to.has(format)).length < to.size;
    }
}

