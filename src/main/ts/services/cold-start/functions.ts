import { Client } from "types/db-objects/Client";
import { WikiCategory } from "types/db-objects/WikiCategory";
import { ResourceURL } from "types/db-objects/ResourceURL";
import { ClientHeader } from "types/db-objects/ClientHeader";
import { fancyLog } from "common/util";
import { ResourceThrottle } from "types/db-objects/ResourceThrottle";
import { WordVectorSource } from "types/db-objects/WordVectorSource";
import { Predicate } from "types/db-objects/Predicate";

export function getObjectsToInsert() {
    const origin = "https://en.wikipedia.org/wiki/Category:News_media";
    const url = new ResourceURL(origin);
    const urlThrottle = new ResourceThrottle(origin, 7 * 24 * 60 * 60 * 1000);
    const wikiCategory = new WikiCategory({
        parent: url,
        child: url,
    });
    const wordVectorSources = [
        new WordVectorSource({
            resource: new ResourceURL("https://dl.fbaipublicfiles.com/fasttext/vectors-english/wiki-news-300d-1M.vec.zip"),
            label: "fasttext_wiki-news-300d-1M",
        }),
        new WordVectorSource({
            resource: new ResourceURL("https://dl.fbaipublicfiles.com/fasttext/vectors-english/wiki-news-300d-1M-subword.vec.zip"),
            label: "fasttext_wiki-news-300d-1M-subw",
        }),
        new WordVectorSource({
            resource: new ResourceURL("https://dl.fbaipublicfiles.com/fasttext/vectors-english/crawl-300d-2M.vec.zip"),
            label: "fasttext_crawl-300d-2M",
        }),
        new WordVectorSource({
            resource: new ResourceURL("https://dl.fbaipublicfiles.com/fasttext/vectors-english/crawl-300d-2M-subword.zip"),
            label: "fasttext_crawl-300d-2M-subw",
        }),
    ];
    const clients = [
        new Client({ name: "ubuntu-mozilla", httpVersion: "1.1" }),
        new Client({ name: "mac-chrome", httpVersion: "1.1" }),
        new Client({ name: "mac-safari", httpVersion: "1.1" }),
    ];
    const clientHeaders = [
        new ClientHeader(clients[0].name, "user-agent",
            "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:78.0) Gecko/20100101 Firefox/78.0"),
        new ClientHeader(clients[0].name, "accept", "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8"),
        new ClientHeader(clients[0].name, "accept-language", "en-US,en;q=0.5"),
        new ClientHeader(clients[0].name, "accept-encoding", "gzip, deflate, br"),
        new ClientHeader(clients[0].name, "connection", "keep-alive"),
        new ClientHeader(clients[0].name, "upgrade-insecure-requests", "1"),


        new ClientHeader(clients[1].name, "dnt", "1"),
        new ClientHeader(clients[1].name, "upgrade-insecure-requests", "1"),
        new ClientHeader(clients[1].name, "user-agent",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/83.0.4103.116 Safari/537.36"),
        new ClientHeader(clients[1].name, "accept",
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,/;q=0.8,application/signed-exchange;v=b3;q=0.9"),
        new ClientHeader(clients[1].name, "sec-fetch-site", "none"),
        new ClientHeader(clients[1].name, "sec-fetch-mode", "navigate"),
        new ClientHeader(clients[1].name, "sec-fetch-user", "?1"),
        new ClientHeader(clients[1].name, "sec-fetch-dest", "document"),
        new ClientHeader(clients[1].name, "accept-language", "sv-SE,sv;q=0.9,en-US;q=0.8,en;q=0.7"),

        new ClientHeader(clients[2].name, "Accept", "text/html,application/xhtml+xml,application/xml;q=0.9,/;q=0.8"),
        new ClientHeader(clients[2].name, "accept-encoding", "gzip, deflate"),
        new ClientHeader(clients[2].name, "accept-language", "en-us"),
        new ClientHeader(clients[2].name, "connection", "keep-alive"),
        new ClientHeader(clients[2].name, "upgrade-insecure-requests", "1"),
        new ClientHeader(clients[2].name, "user-agent",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_6) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.1.1 Safari/605.1.15"),
    ];

    const relations = [
        Predicate.RES_IS_NEWS_SOURCE_WIKI,
        Predicate.T,
    ];

    return [
        wikiCategory,
        urlThrottle,
        ...clients,
        ...clientHeaders,
        ...wordVectorSources,
        ...relations,
    ];
}

export async function insertColdStartObjects() {
    const promises = [];
    for (const obj of getObjectsToInsert()) {
        fancyLog(JSON.stringify(obj));
        promises.push(obj.singularInsert({ recursive: true }));
    }

    await Promise.all(promises);
}
