import { Client } from "types/objects/Client";
import { WikiCategory } from "types/objects/WikiCategory";
import { ResourceURL } from "types/objects/ResourceURL";
import { ClientHeader } from "types/objects/ClientHeader";
import { fancyLog } from "common/util";

export function getObjectsToInsert() {
    const url = new ResourceURL("https://en.wikipedia.org/wiki/Category:News_media");
    const wikiCategory = new WikiCategory({
        parent: url,
        child: url,
    });
    const client0: Client = new Client({
        name: "ubuntu-mozilla",
        httpVersion: "1.1",
    });
    const client1: Client = new Client({
        name: "mac-chrome",
        httpVersion: "1.1",
    });
    const client2: Client = new Client({
        name: "mac-safari",
        httpVersion: "1.1",
    });
    const clientHeaders = [
        new ClientHeader(client0.name, "user-agent",
            "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:78.0) Gecko/20100101 Firefox/78.0"),
        new ClientHeader(client0.name, "accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"),
        new ClientHeader(client0.name, "accept-language", "en-US,en;q=0.5"),
        new ClientHeader(client0.name, "accept-encoding", "gzip, deflate, br"),
        new ClientHeader(client0.name, "connection", "keep-alive"),
        new ClientHeader(client0.name, "upgrade-insecure-requests", "1"),


        new ClientHeader(client1.name, "dnt", "1"),
        new ClientHeader(client1.name, "upgrade-insecure-requests", "1"),
        new ClientHeader(client1.name, "user-agent",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36"),
        new ClientHeader(client1.name, "accept",
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,/;q=0.8,application/signed-exchange;v=b3;q=0.9"),
        new ClientHeader(client1.name, "sec-fetch-site", "none"),
        new ClientHeader(client1.name, "sec-fetch-mode", "navigate"),
        new ClientHeader(client1.name, "sec-fetch-user", "?1"),
        new ClientHeader(client1.name, "sec-fetch-dest", "document"),
        new ClientHeader(client1.name, "accept-language", "sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7"),

        new ClientHeader(client2.name, "Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,/;q=0.8"),
        new ClientHeader(client2.name, "accept-encoding", "gzip, deflate"),
        new ClientHeader(client2.name, "accept-language", "en-us"),
        new ClientHeader(client2.name, "connection", "keep-alive"),
        new ClientHeader(client2.name, "upgrade-insecure-requests", "1"),
        new ClientHeader(client2.name, "user-agent",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Safari/605.1.15"),
    ];

    return [wikiCategory, client0, client1, client2, ...clientHeaders];
}

export async function insertColdStartObjects() {
    const promises = [];
    for (const obj of getObjectsToInsert()) {
        fancyLog(JSON.stringify(obj));
        promises.push(obj.singularInsert({ recursive: true }));
    }

    await Promise.all(promises);
}
