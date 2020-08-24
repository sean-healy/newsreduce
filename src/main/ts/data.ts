import fs from "fs";
import sql from "sql";
import { ResourceURL } from "types/db-objects/ResourceURL";
import { fancyLog, writeBigUInt96BE, Dictionary } from "utils/alpha";
import { Redis, REDIS_PARAMS } from "common/Redis";
import { SQL } from "common/SQL";
import { DBObject } from "types/DBObject";
import { WordVectorSource } from "types/db-objects/WordVectorSource";

export async function genericSQLPromise<From = { [key: string]: any }[], To = { [key: string]: any }[]>(
    query: string,
    params: any[] = [],
    mapper?: (v: From) => To
): Promise<To> {
    let response: From | To = await SQL.query<From>(query, params);
    if (mapper && response) response = mapper(response);
    return response as To;
}

type Schedule = { id: bigint, url: string };
export function selectPreSchedule() {
    return genericSQLPromise<any, Schedule[]>(sql.SELECT_RESOURCES_TO_FETCH);
}
export async function schedule(items: Schedule[]) {
    fancyLog(`Attempting to schedule ${items.length} URLs.`);
    const promises = [];
    let scheduled = 0;
    for (const item of items) {
        const resourceURL = new ResourceURL(item.url);
        if (!await resourceURL.isFetchLocked()) {
            promises.push(Redis.renewRedis(REDIS_PARAMS.fetchSchedule)
                .zincrby(resourceURL.host.name, 1, item.url));
            ++scheduled;
        }
    }
    if (scheduled) fancyLog(`Scheduled ${scheduled} URLs.`);

    await Promise.all(promises);
}

export async function selectResourceVersions() {
    const query = sql.SELECT_RESOURCE_VERSIONS;
    const rows = await genericSQLPromise(query);
    const resources: { [key: string]: Map<number, Set<string>> } = {};
    for (const row of rows) {
        const url: string = row.url;
        const time: number = row.time;
        const filename: string = row.filename;
        let times: Map<number, Set<string>>;
        if (url in resources)
            times = resources[url];
        else {
            times = new Map();
            resources[url] = times;
        }
        let formats: Set<string>;
        if (times.has(time)) {
            formats = times.get(time);
        } else {
            formats = new Set();
            times.set(time, formats);
        }
        formats.add(filename);
    }

    return resources;
}

export async function selectBagOfWordsByHost() {
    const query = sql.SELECT_BAG_OF_WORDS_RESOURCE_HOST_PAIRS;
    const rows = await genericSQLPromise(query);
    const hosts = new Map<bigint, [bigint, number][]>();
    for (const row of rows) {
        const resource: bigint = BigInt(row.resource);
        const time: number = row.time;
        const host = row.host;
        const version: [bigint, number] = [resource, time];
        if (hosts.has(host)) hosts.get(host).push(version);
        else hosts.set(host, [version]);
    }

    return hosts;
}

export async function selectBacklinksCount() {
    return (await genericSQLPromise(sql.SELECT_BACKLINKS_COUNT))[0].c;
}

export async function writeBacklinksToFile(fd: number) {
    const idBytes = Buffer.alloc(12);
    let rows = 0;
    //const stream = (await SQL.db()).query(sql.SELECT_BACKLINKS.replace(/;/, " limit 100000;")).stream();
    const stream = (await SQL.db()).query(sql.SELECT_BACKLINKS).stream();
    stream.on("data", ({ parent, child }) => {
        ++rows;
        if ((rows & 0xFFFF) === 0)
            process.stdout.write(
                `\r                            \rWriting row: ${`${rows}`.replace(/(...)/g, "$1,").replace(/,$/, "")}`);
        writeBigUInt96BE(parent, idBytes);
        fs.writeSync(fd, idBytes);
        writeBigUInt96BE(child, idBytes);
        fs.writeSync(fd, idBytes);
    });
    await new Promise<void>(res => {
        let closed = false;
        const accept = () => {
            if (!closed) {
                console.log();
                closed = true;
                fs.closeSync(fd);
                res();
            }
        };
        stream.on("close", accept);
        stream.on("end", accept);
    });

    return rows;
}

export async function writeLinkGraphResourcesToFile(fd: number) {
    const idBytes = Buffer.alloc(12);
    let i = 0;
    const stream = (await SQL.db()).query(sql.SELECT_LINK_GRAPH_RESOURCES).stream();
    //const stream = (await SQL.db()).query(sql.SELECT_LINK_GRAPH_RESOURCES.replace(/;/, " limit 100000;")).stream();
    stream.on("data", ({ resource }) => {
        ++i;
        if ((i & 0xFFFF) === 0)
            process.stdout.write(
                `\r                            \rWriting row: ${`${i}`.replace(/(...)/g, "$1,").replace(/,$/, "")}`);
        writeBigUInt96BE(resource, idBytes);
        fs.writeSync(fd, idBytes);
    });
    await new Promise<void>(res => {
        let closed = false;
        const accept = () => {
            if (!closed) {
                console.log();
                closed = true;
                fs.closeSync(fd);
                res();
            }
        };
        stream.on("close", accept);
        stream.on("end", accept);
    });
}

export async function selectBOWsForRelation(relation: bigint, polarity: boolean) {
    const rows = await genericSQLPromise(sql.SELECT_BOW_FOR_RELATION, [relation, polarity]);
    return rows.map(({resource, time}) => [BigInt(resource), time]);
}

export async function selectStopWords() {
    const rows = await genericSQLPromise(sql.SELECT_STOP_WORDS);
    return new Map<bigint, number>(rows.map(({id, frequency}) => [BigInt(id), parseFloat(frequency)]));
}

export async function selectVersionsToProcess(from: bigint[], to: bigint[], lo: bigint, hi: bigint, log = false) {
    const params = [[to], lo, hi, [from], from.length * to.length];
    const query = sql.SELECT_RESOURCE_VERSIONS_TO_PROCESS;
    if (log) {
        DBObject.stringifyBigIntsInPlace(params);
        fancyLog(JSON.stringify({query, params}));
    }
    const rows = await genericSQLPromise(query, params);
    
    return rows;
}

export async function selectDocumentWordVectors(wordIDs: bigint[]) {
    const params = [WordVectorSource.DEFAULT.resource.getID(), [wordIDs]];
    return await genericSQLPromise(sql.SELECT_DOCUMENT_WORD_VECTORS, params);
}

export async function selectNewsSourceHomepages() {
    const hosts = (await genericSQLPromise(sql.SELECT_NEWS_SOURCE_HOMEPAGES)).map(r => r.value);
    const homepages: string[] = [];
    for (const host of hosts) {
        const homepage = new ResourceURL({
            host: host,
            path: "",
            query: "",
            ssl: false,
            port: 80,
        });
        homepages.push(homepage.toURL());
    }

    return homepages;
}

interface SubDocTrainingDataRow {
    resource: ResourceURL;
    attribute: string;
    pattern: RegExp;
}
export async function selectSubDocTrainingData() {
    const rows = await genericSQLPromise(sql.SELECT_SUB_DOC_TRAINING_DATA);
    const data: Dictionary<SubDocTrainingDataRow[]> = {};
    for (const row of rows) {
        const predicate: string = row.predicate;
        let predicateRows: SubDocTrainingDataRow[];
        if (predicate in data)
            predicateRows = data[predicate];
        else {
            predicateRows = [];
            data[predicate] = predicateRows;
        }
        predicateRows.push({
            resource: new ResourceURL(row.url),
            attribute: row.attribute,
            pattern: new RegExp(`^${row.pattern}$`),
        })
    }

    return data;
}

export async function selectDefiniteNewsSourceWikis() {
    const rows = await genericSQLPromise(sql.SELECT_DEFINITE_NEWS_SOURCE_WIKIS);

    return rows.map(r => r.url);
}