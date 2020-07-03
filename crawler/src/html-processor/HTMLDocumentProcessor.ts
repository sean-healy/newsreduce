import { Resource } from "../types/Resource";
import { DOMWindow } from "jsdom";

export interface HTMLDocumentProcessor {
    (doc: DOMWindow, resource: Resource, version: number, resourceID?: bigint): Promise<unknown>[];
}
