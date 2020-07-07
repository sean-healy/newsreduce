import { ResourceURL } from "../types/Resource";
import { DOMWindow } from "jsdom";

export interface HTMLDocumentProcessor {
    (doc: DOMWindow, resource: ResourceURL, version: number, resourceID?: bigint): Promise<unknown>[];
}
