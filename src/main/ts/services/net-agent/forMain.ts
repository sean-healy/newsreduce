import fs from "fs";
import crypto from "crypto";
import { log } from "common/logging";
import { newFilteredServer } from "./functions";
import { fancyLog, bytesToBigInt } from "utils/alpha";
import { SQL } from "common/SQL";
import { DBObject } from "types/DBObject";
import { findTimes, findFormats, read } from "file";
import { Entity } from "types/Entity";
import { VersionType } from "types/db-objects/VersionType";
import { WordHits } from "types/WordHits";
import { LinkHits } from "types/LinkHits";
import { BagOfWords } from "ml/bags/BagOfWords";
import { BinaryBag } from "ml/bags/BinaryBag";
import { GlobalConfig } from "common/GlobalConfig";
import { ResourceBinaryRelation } from "types/db-objects/ResourceBinaryRelation";
import { ResourceID, ResourceURL } from "types/db-objects/ResourceURL";
import { Predicate } from "types/db-objects/Predicate";
import { JSDOM } from "jsdom";
import { ResourceKeyValue } from "types/db-objects/ResourceKeyValue";
import { Key } from "types/db-objects/Key";
import { WordVector } from "types/db-objects/WordVector";

const PORT = 9999;

//const REPLACE_ANCHORS = true;
const REPLACE_ANCHORS = false;

async function randHTML() {
    const id = bytesToBigInt(crypto.randomBytes(12));
    const query = `select * from `
        + `(select rv.resource, rv.time, filename `
        + `from VersionType vt `
        + `inner join ResourceVersion rv on rv.type = vt.id `
        + `inner join ResourceBinaryRelation rbr on rbr.resource = rv.resource `
        + `left outer join ResourceRank rr on rr.resource = rv.resource `
        + `left outer join ResourceKeyValue rkv on rkv.resource = rv.resource and rkv.\`key\` = 12484556344330953527815669801 `
        + `where filename = "raw.html" `
        + `and rbr.relation = 74364767655049632829344255629 `
        + `and rkv.resource is null `
        + `and rbr.polarity = 1 `
        //+ `order by rr.\`rank\` desc, rv.resource `
        + `) t where resource >= ${id} limit 1`;

    return (await SQL.query<any>(query))[0];
}

async function versionAndContentType(params: {
    entity: Entity,
    format: string,
    id: bigint,
    time: number,
    url?: string,
}) {
    let { entity, format, id, time } = params;
    const suffixPattern = /_(TRUE|FALSE)$/;
    const suffixMatch = format.match(suffixPattern)
    let suffix: string;
    if (suffixMatch) {
        suffix = suffixPattern[1];
        format = format.replace(suffixPattern, "");
    } else {
        suffix = null;
    }
    console.log("read", entity, id, time, new VersionType(format), suffix);
    let version = await read(entity, id, time, new VersionType(format), suffix);
    let contentType: string;
    switch (format) {
        case VersionType.WORD_HITS.filename:
            version = Buffer.from(new WordHits().fromBuffer(version).toString());
            contentType = "text/plain; charset=UTF-8";
            break;
        case VersionType.LINK_HITS.filename:
            version = Buffer.from(new LinkHits().fromBuffer(version).toString());
            contentType = "text/plain; charset=UTF-8";
            break;
        case VersionType.BAG_OF_WORDS.filename:
        case VersionType.BAG_OF_SKIP_GRAMS.filename:
        case VersionType.BAG_OF_BIGRAMS.filename:
        case VersionType.BAG_OF_TRIGRAMS.filename:
        case VersionType.BAG_OF_LINKS.filename:
        case VersionType.REDUCED_BAG_OF_WORDS.filename:
        case VersionType.REDUCED_BAG_OF_SKIP_GRAMS.filename:
        case VersionType.REDUCED_BAG_OF_BIGRAMS.filename:
        case VersionType.REDUCED_BAG_OF_TRIGRAMS.filename:
            version = Buffer.from(new BagOfWords().fromBuffer(version).toString());
            contentType = "text/plain; charset=UTF-8";
            break;
        case VersionType.BINARY_BAG_OF_WORDS.filename:
        case VersionType.BINARY_BAG_OF_SKIP_GRAMS.filename:
        case VersionType.BINARY_BAG_OF_TRIGRAMS.filename:
        case VersionType.BINARY_BAG_OF_BIGRAMS.filename:
        case VersionType.BINARY_BAG_OF_LINKS.filename:
        case VersionType.REDUCED_BINARY_BAG_OF_WORDS.filename:
        case VersionType.REDUCED_BINARY_BAG_OF_SKIP_GRAMS.filename:
        case VersionType.REDUCED_BINARY_BAG_OF_TRIGRAMS.filename:
        case VersionType.REDUCED_BINARY_BAG_OF_BIGRAMS.filename:
            version = Buffer.from(BinaryBag.ofWords().fromBuffer(version).toString());
            contentType = "text/plain; charset=UTF-8";
            break;
        case VersionType.RAW_HTML.filename:
            contentType = "text/html; charset=UTF-8";
            if (REPLACE_ANCHORS) {
                const dom = new JSDOM(version, { url: params.url });
                const anchors = dom.window.document.querySelectorAll("a");
                for (let i = 0; i < anchors.length; ++i) {
                    const anchor = anchors[i];
                    const parent = Buffer.from(params.url).toString("hex");
                    const child = Buffer.from(anchor.href.toString()).toString("hex");
                    anchor.href = `/register-homepage?parent=${parent}&child=${child}`;
                }
                version = Buffer.from(dom.serialize());
            }
            break;
        case VersionType.WIKI_CATS.filename:
        case VersionType.WIKI_PAGES.filename:
            version = Buffer.from(version.toString("hex").match(/.{24}/g).join("\n"));
            contentType = "text/plain; charset=UTF-8";
            break;
        case VersionType.DOCUMENT_VECTOR.filename:
            version = Buffer.from(JSON.stringify(WordVector.bufferToVector(version)));
            contentType = "text/html; charset=UTF-8";
            break;
        default:
            contentType = "text/plain; charset=UTF-8";
            break;
    }
    return { version, contentType };
};

async function serve() {
    const app = await newFilteredServer();
    app.get("", (req, res) => {
        log(`Request for parameters from ${req.ip}.`);
        res.send(GlobalConfig.hardFetch());
    });
    app.get("/net", (req, res) => {
        log(`Request for network info from ${req.ip}.`);
        res.send(fs.readFileSync("/var/newsreduce/network"));
    });
    app.get("/ip", (req, res) => {
        log(`Request ip info for ${req.ip}.`);
        res.send(req.ip);
    });
    app.get("/public-key", (req, res) => {
        log(`Request SSH public key info for ${req.ip}.`);
        res.send(fs.readFileSync("/var/newsreduce/.ssh/id_rsa.pub"));
    });
    app.get("/query", async (req, res) => {
        const encodedSQL = req.query.sql as string;
        const sql = Buffer.from(encodedSQL, "hex").toString();
        console.log(sql);
        const result = await SQL.query<{ [key: string]: any }[]>(sql);
        DBObject.stringifyBigIntsInPlace(result);
        res.send(JSON.stringify(result));
    });
    app.get("/resource-times", async (req, res) => {
        const id = BigInt(req.query.id);
        const times = await findTimes(Entity.RESOURCE, id);
        res.send(JSON.stringify(times));
    });
    app.get("/resource-formats", async (req, res) => {
        const id = BigInt(req.query.id);
        const time = Number(req.query.time);
        const formats = (await findFormats(Entity.RESOURCE, id, time)).map(format => format.filename);
        res.send(JSON.stringify(formats));
    });
    app.get("/resource-version", async (req, res) => {
        const id = BigInt(req.query.id);
        const time = Number(req.query.time);
        const format = req.query.format as string;
        const query = `select url from URLView where resource = ${id}`;
        const url = (await SQL.query<any>(query))[0].url;
        const { version, contentType } =
            await versionAndContentType({ entity: Entity.RESOURCE, id, time, format, url });
        res.contentType(contentType).send(version.toString());
    });
    app.get("/host-times", async (req, res) => {
        const id = BigInt(req.query.id);
        const times = await findTimes(Entity.HOST, id);
        res.send(JSON.stringify(times));
    });
    app.get("/host-formats", async (req, res) => {
        const id = BigInt(req.query.id);
        const time = Number(req.query.time);
        const formats = (await findFormats(Entity.HOST, id, time)).map(format => format.filename);
        res.send(JSON.stringify(formats));
    });
    app.get("/host-version", async (req, res) => {
        const id = BigInt(req.query.id);
        const time = Number(req.query.time);
        const format = req.query.format as string;
        const { version, contentType } =
            await versionAndContentType({ entity: Entity.HOST, id, time, format });
        res.contentType(contentType).send(version.toString());
    });
    app.get("/predicate-times", async (req, res) => {
        const id = BigInt(req.query.id);
        const times = await findTimes(Entity.PREDICATE, id);
        res.send(JSON.stringify(times));
    });
    app.get("/predicate-formats", async (req, res) => {
        const id = BigInt(req.query.id);
        const time = Number(req.query.time);
        const formats = (await findFormats(Entity.PREDICATE, id, time)).map(format => format.filename);
        res.send(JSON.stringify(formats));
    });
    app.get("/predicate-version", async (req, res) => {
        const id = BigInt(req.query.id);
        const time = Number(req.query.time);
        const format = req.query.format as string;
        const { version, contentType } =
            await versionAndContentType({ entity: Entity.PREDICATE, id, time, format });
        res.contentType(contentType).send(version.toString());
    });
    app.get("/rand-html", async (req, res) => {
        res.send(randHTML());
    });
    app.post("/wiki-news-source", (req, res) => {
        const { resource, polarity } = req.body;
        console.log(req.body);
        new ResourceBinaryRelation({
            resource: new ResourceID(resource),
            relation: Predicate.RES_IS_NEWS_SOURCE_WIKI,
            polarity
        }).enqueueInsert({ recursive: true });
        res.status(200).send();
    })
    app.get("/register-homepage", async (req, res) => {
        const parent = new Buffer(req.query.parent as string, "hex").toString();
        const child = new Buffer(req.query.child as string, "hex").toString();
        const resource = new ResourceURL(parent);
        const homepage = new ResourceURL(child).host.name;
        console.log({
            resource, homepage
        });
        await new ResourceKeyValue({
            resource,
            key: Key.WIKI_NEWS_SOURCE_HOMEPAGE,
            value: homepage,
        }).singularInsert();
        const html = await randHTML();
        const query = `select url from URLView where resource = ${html.resource}`;
        const url = (await SQL.query<any>(query))[0].url;
        const { version, contentType } =
            await versionAndContentType({ entity: Entity.RESOURCE, id: html.resource, time: html.time, format: html.filename, url });
        res.contentType(contentType).send(version.toString());
    });

    app.listen(PORT, () => fancyLog(`Main net agent running on port ${PORT} `));
}

serve();
