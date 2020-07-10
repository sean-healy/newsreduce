import { Client } from "types/objects/Client";
import { WikiCategory } from "types/objects/WikiCategory";
import { ResourceURL } from "types/objects/ResourceURL";
import { ClientHeader } from "types/objects/ClientHeader";

export function getObjectsToInsert() {
    const url = new ResourceURL("https://en.wikipedia.org/wiki/Category:News_media");
    const wikiCategory = new WikiCategory({
        parent: url,
        child: url,
    });
    const clientName = "ubuntu-mozilla";
    const client: Client = new Client({
        name: clientName,
        httpVersion: "1.1",
    });
    const clientHeaders = [
        new ClientHeader(clientName, "User-Agent", "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:78.0) Gecko/20100101 Firefox/78.0"),
        new ClientHeader(clientName, "Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"),
        new ClientHeader(clientName, "Accept-Language", "en-US,en;q=0.5"),
        new ClientHeader(clientName, "Accept-Encoding", "gzip, deflate, br"),
        new ClientHeader(clientName, "Connection", "keep-alive"),
        new ClientHeader(clientName, "Upgrade-Insecure-Requests", "1"),
    ]

    return [wikiCategory, client, ...clientHeaders];
}

export async function insertColdStartObjects() {
    const promises = [];
    for (const obj of getObjectsToInsert()) {
        console.log(obj);
        promises.push(obj.singularInsert({ recursive: true }));
    }

    await Promise.all(promises);
}
