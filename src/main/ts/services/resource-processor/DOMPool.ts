import { JSDOM } from "jsdom";
import { ResourceURL } from "types/db-objects/ResourceURL";

export class DOMPool {
    readonly pool: Map<bigint, Map<number, JSDOM>> = new Map();

    renew(resource: ResourceURL, time: number, buffer: Buffer) {
        let dom: JSDOM;
        const id = resource.getID();
        if (this.pool.has(id) && this.pool.get(id).has(time)) dom = this.pool.get(id).get(time);
        else dom = this.replace(resource, time, buffer);
        
        return dom;
    }

    replace(resource: ResourceURL, time: number, buffer: Buffer) {
        let dom: JSDOM;
        const id = resource.getID();
        if (!this.pool.has(id)) this.pool.set(id, new Map());
        const times = this.pool.get(id)
        dom = new JSDOM(buffer, { url: resource.toURL() });
        times.set(time, dom);

        return dom;
    }
}