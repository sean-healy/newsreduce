import { Dictionary } from "common/util";
import { DOMPool } from "./DOMPool";
import { ResourceURL } from "types/objects/ResourceURL";

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
    abstract ro(): boolean;
    abstract apply(resource: ResourceURL, input: Dictionary<Buffer | ResourceURL>, time?: number, domPool?: DOMPool, reDOM?: boolean): Promise<void>;
    abstract from(): Set<string>;
    abstract to(): Set<string>;
    hosts(): Set<string> {
        return null;
    }
    appliesTo(formats: string[], resource: ResourceURL) {
        const hosts = this.hosts();
        const from = this.from();
        const to = this.to();
        return (!hosts || hosts.has(resource.host.name))
            && formats.filter(format => from.has(format)).length === from.size
            && formats.filter(format => to.has(format)).length < to.size;
    }
}

