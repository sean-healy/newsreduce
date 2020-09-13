import { JSDOM } from "jsdom";
import { ResourceURL } from "types/db-objects/ResourceURL";
import { fancyLog } from "utils/alpha";

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
        try {
            dom = new JSDOM(buffer, { url: resource.toURL() });
        } catch (e) {
            fancyLog(JSON.stringify(e))
            try {
                dom = new JSDOM(buffer, { url: `http://${resource.host.name}/` });
            } catch (e) {
                fancyLog(JSON.stringify(e))
                dom = new JSDOM(buffer);
            }
        }
        times.set(time, dom);

        return dom;
    }
}