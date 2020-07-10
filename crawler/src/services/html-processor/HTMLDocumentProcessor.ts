import { DOMWindow } from "jsdom";

export interface HTMLDocumentProcessor {
    (doc: DOMWindow, version?: number): Promise<void>;
}
