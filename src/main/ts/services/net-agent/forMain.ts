import fs from "fs";
import crypto from "crypto";
import { log } from "common/logging";
import { newFilteredServer } from "./functions";
import { fancyLog, bytesToBigInt } from "common/util";
import { SQL } from "common/SQL";
import { DBObject } from "types/DBObject";
import { findTimes, findFormats, read } from "file";
import { Entity } from "types/Entity";
import { VersionType } from "types/db-objects/VersionType";
import { WordHits } from "types/WordHits";
import { LinkHits } from "types/LinkHits";
import { BagOfWords } from "types/ml/BagOfWords";
import { BinaryBag } from "types/ml/BinaryBag";
import { GlobalConfig } from "common/GlobalConfig";
import { ResourceBinaryRelation } from "types/db-objects/ResourceBinaryRelation";
import { ResourceID, ResourceURL } from "types/db-objects/ResourceURL";
import { Predicate } from "types/db-objects/Predicate";

const PORT = 9999;

async function versionAndContentType(params: {
    entity: Entity,
    format: string,
    id: bigint,
    time: number
}) {
    const { entity, format, id, time } = params;
    let version = await read(entity, id, time, new VersionType(format));
    let contentType: string;
    switch (format) {
        case VersionType.RAW_HEADERS.filename:
        case VersionType.RAW_WORDS_TXT.filename:
        case VersionType.RAW_LINKS_TXT.filename:
        case VersionType.TITLE.filename:
            contentType = "text/plain; charset=UTF-8";
            break;
        case VersionType.WORD_HITS.filename:
            version = Buffer.from(new WordHits().fromBuffer(version).toString());
            contentType = "text/plain; charset=UTF-8";
            break;
        case VersionType.LINK_HITS.filename:
            version = Buffer.from(new LinkHits().fromBuffer(version).toString());
            contentType = "text/plain; charset=UTF-8";
            break;
        case VersionType.BAG_OF_WORDS.filename:
        case VersionType.TRUE_BAG_OF_WORDS.filename:
        case VersionType.FALSE_BAG_OF_WORDS.filename:
            version = Buffer.from(new BagOfWords().fromBuffer(version).toString());
            contentType = "text/plain; charset=UTF-8";
            break;
        case VersionType.BINARY_BAG_OF_WORDS.filename:
            version = Buffer.from(BinaryBag.ofWords().fromBuffer(version).toString());
            contentType = "text/plain; charset=UTF-8";
            break;
        case VersionType.RAW_HTML.filename:
            contentType = "text/html; charset=UTF-8";
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
        const { version, contentType } =
            await versionAndContentType({ entity: Entity.RESOURCE, id, time, format });
        res.contentType(contentType).send(version.toString());
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
        const id = bytesToBigInt(crypto.randomBytes(12));
        const query = `select * from `
            + `(select rv.resource, rv.time, filename `
            + `from VersionType vt `
            + `inner join ResourceVersion rv on rv.type = vt.id `
            + `where filename = "raw.html") t where resource >= ${id} `
            + `order by resource limit 1`;
        console.log(query);
        res.send((await SQL.query<any>(query))[0]);
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

    app.listen(PORT, () => fancyLog(`Main net agent running on port ${PORT}`));
}

serve();