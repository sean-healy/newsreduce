import { Client } from "types/db-objects/Client";
import { WikiCategory } from "types/db-objects/WikiCategory";
import { ResourceURL } from "types/db-objects/ResourceURL";
import { ClientHeader } from "types/db-objects/ClientHeader";
import { fancyLog } from "common/util";
import { ResourceThrottle } from "types/db-objects/ResourceThrottle";
import { WordVectorSource } from "types/db-objects/WordVectorSource";
import { Predicate } from "types/db-objects/Predicate";
import { HTMLAttributeName } from "types/db-objects/HTMLAttributeName";
import { Pattern } from "types/db-objects/Pattern";
import { ResourceSubDocumentTrain } from "types/db-objects/ResourceSubDocumentTrain";

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
        Predicate.SUB_DOC_IS_NEWS_SOURCE_HOMEPAGE,
    ];

    const patterns = [
        new Pattern("https?://algomhoriah.com/?"),
        new Pattern("https?://www.ptj.com.pk/?"),
        new Pattern("https?://www.troyrecord.com/?"),
        new Pattern("https?://brooklynpaper.com/?"),
        new Pattern("https?://www.thekararnivang.com/?"),
        new Pattern("https?://www.carillonregina.com/?"),
        new Pattern("https?://www.itv.com/?"),
        new Pattern("https?://www.yangtse.com/?"),
        new Pattern("https?://www.oxfordmail.co.uk/?"),
        new Pattern("https?://www.register-herald.com/?"),
        new Pattern("https?://www.georgiastatesignal.com/?"),
        new Pattern("https?://www.times-age.co.nz/?"),
        new Pattern("https?://fultonhistory.com/?"),
        new Pattern("https?://thebrownsvilletimes.com/?"),
        new Pattern("https?://www.manilatimes.net/?"),
        new Pattern("https?://visao.sapo.pt/?"),
        new Pattern("https?://www.jamestownnews.com/?"),
        new Pattern("https?://www.usatoday.com/?"),
        new Pattern("https?://www.urbantulsa.com/?"),
        new Pattern("https?://www.diariodemocracia.com/?"),
        new Pattern("https?://www.meed.com/?"),
        new Pattern("https?://zetatijuana.com/?"),
        new Pattern("https?://www.fuquay-varinaindependent.com/?"),
        new Pattern("https?://lifestyleasia.com/?"),
        new Pattern("https?://www.belfasttelegraph.co.uk/?"),
        new Pattern("https?://www.ladiscusion.cl/?"),
        new Pattern("https?://www.gazetanovgorod.ru/?"),
        new Pattern("https?://www.sermitsiaq.gl/?"),
        new Pattern("https?://www.freep.com/?"),
        new Pattern("https?://www.westviewnews.org/?"),
        new Pattern("https?://www.revistapiaui.com.br/?"),
        new Pattern("https?://nmgazette.narod.ru/?"),
        new Pattern("https?://www.aliceechonews.com/?"),
        new Pattern("https?://offalyindependent.ie/?"),
        new Pattern("https?://www.georgetownvoice.com/?"),
        new Pattern("https?://www.rbcdaily.ru/?"),
        new Pattern("https?://news.kbs.co.kr/?"),
        new Pattern("https?://ctvnews.ca/?"),
        new Pattern("https?://www.volksblad.com/?"),
        new Pattern("https?://www.duquoin.com/?"),
        new Pattern("https?://www.dailydemocrat.com/?"),
        new Pattern("https?://www.dailytimes.ng/?"),
        new Pattern("https?://www.qx.se/?"),
        new Pattern("https?://lmtribune.com/?"),
        new Pattern("https?://www.heraldbanner.com/?"),
        new Pattern("https?://www.nytimes.com/?"),
        new Pattern("https?://web.archive.org/?"),
        new Pattern("https?://www.messaggeroveneto.it/?"),
        new Pattern("https?://www.labusinessjournal.com/?"),
        new Pattern("https?://www.dawn.com/?"),
        new Pattern("https?://www.sisa-savolehti.fi/?"),
        new Pattern("https?://southsideweekly.com/?"),
        new Pattern("https?://www.lavoixdunord.fr/?"),
        new Pattern("https?://www.reporterherald.com/?"),
        new ResourceSubDocumentTrain({
            resource: new ResourceURL("https://en.wikipedia.org/wiki/The_Tyee"),
            pattern: new Pattern("https://thetyee.ca/"),
            attribute: new HTMLAttributeName("href"),
            predicate: Predicate.SUB_DOC_IS_NEWS_SOURCE_HOMEPAGE,
        }),
        new ResourceSubDocumentTrain({
            resource: new ResourceURL("https://en.wikipedia.org/wiki/The_Herald_(Rock_Hill)"),
            pattern: new Pattern("http://www.heraldonline.com"),
            attribute: new HTMLAttributeName("href"),
            predicate: Predicate.SUB_DOC_IS_NEWS_SOURCE_HOMEPAGE,
        }),
        new ResourceSubDocumentTrain({
            resource: new ResourceURL("https://en.wikipedia.org/wiki/The_Daily_Post_(New_Zealand)"),
            pattern: new Pattern("http://www.dailypost.co.nz/"),
            attribute: new HTMLAttributeName("href"),
            predicate: Predicate.SUB_DOC_IS_NEWS_SOURCE_HOMEPAGE,
        }),
    ];

    return [
        wikiCategory,
        urlThrottle,
        ...clients,
        ...clientHeaders,
        ...wordVectorSources,
        ...relations,
        ...patterns,
        new HTMLAttributeName("href"),
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
