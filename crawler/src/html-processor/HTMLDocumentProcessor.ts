import { ResourceURL } from "../types/objects/ResourceURL";
import { DOMWindow } from "jsdom";

export interface HTMLDocumentProcessor {
    (doc: DOMWindow, resource: ResourceURL, version: number, resourceID?: bigint): Promise<unknown>[];
}
