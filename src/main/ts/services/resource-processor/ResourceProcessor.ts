import { Dictionary } from "utils/alpha";
import { DOMPool } from "./DOMPool";
import { ResourceURL } from "types/db-objects/ResourceURL";
import { VersionType } from "types/db-objects/VersionType";
import { selectVersionsToProcess } from "data";
import { InputCache } from "./functions";

const EXCLUDE = [
    "NOSCRIPT",
    "SCRIPT",
    "STYLE",
    "FORM",
    "INPUT",
    "BUTTON",
];

export interface QueueItem {
    id: bigint;
    resource: ResourceURL;
    time: number;
}

export abstract class ResourceProcessor {
    constructor() { }
    ro() { return true; }
    abstract apply(
        resource: ResourceURL,
        input: Dictionary<InputCache>,
        time?: number,
        domPool?: DOMPool,
        reDOM?: boolean
    ): Promise<void>;
    abstract from(): VersionType[];
    abstract to(): VersionType[];
    resourceMatch(resource: ResourceURL) {
        return true;
    }
    async loadQueue(lo: bigint, hi: bigint) {
        const rows = await selectVersionsToProcess(
            [...this.from().map(t => t.getID())],
            [...this.to().map(t => t.getID())],
            lo, hi);
        const filteredRows: QueueItem[] = [];
        for (const { id, url, time } of rows) {
            const resource = new ResourceURL(url);
            if (this.resourceMatch(resource))
                filteredRows.push({ resource, time: parseInt(time), id: BigInt(id) });
        }

        return filteredRows;
    }
}