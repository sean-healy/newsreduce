import { Predicate } from "types/db-objects/Predicate";
import { VersionType } from "types/db-objects/VersionType";
import { Redis } from "common/Redis";
import { SQL } from "common/SQL";
import { selectSubDocTrainingData } from "data";
import { ClassifiedType, SubDocs } from "ml/SubDocs";
import { fancyLog, bytesToBigInt } from "utils/alpha";
import { DamerauLevenshteinAlgo } from "utils/DamerauLevenshteinAlgo";
import { Tokenizer } from "ml/Tokenizer";
import { ResourceURL } from "types/db-objects/ResourceURL";
import { TrainingData } from "ml/trees/TrainingData";
import { TrainingDataPoint } from "ml/trees/TrainingDataPoint";
import { AdaBoost } from "ml/trees/AdaBoost";
import { RandomForest } from "ml/trees/RandomForest";
import { defaultHash } from "common/hashing";

export function frequentFeatures(tokens: (string | string[])[], cut: number) {
    const counts = new Map<string, number>();
    const features = new Set<string>();
    tokens = tokens.filter(t => t);
    if (!tokens.length) return features;
    let multidimensional: boolean = typeof tokens[0] === "object";
    if (multidimensional) for (const row of tokens)
        for (const string of row)
            counts.set(string, (counts.get(string) || 0) + 1);
    else for (const string of tokens as string[])
        counts.set(string, (counts.get(string) || 0) + 1);
    if (multidimensional) for (const row of tokens)
        for (const string of row)
            if (counts.get(string) >= cut)
                features.add(string);
    else for (const string of tokens as string[])
        if (counts.get(string) >= cut)
            features.add(string);
    
    return features;
}

function hash(str: string) {
    //return bytesToBigInt(defaultHash("", str))
    return str;
}

type F = string;
export async function main() {
    const data = await selectSubDocTrainingData();
    for (const functor in data) {
        fancyLog(`Training for predicate: ${functor}`);
        const classifiedSubDocs: ClassifiedType = [];
        const subDocResources: ResourceURL[] = [];
        const docPosition: number[] = [];
        const predicateData = data[functor];
        //for (const { resource, attribute, pattern } of predicateData.slice(0, 10)) {
        for (const { resource, attribute, pattern } of predicateData) {
            //fancyLog(`\t${resource.toURL()}`);
            const subDocs = SubDocs.parseSubDocs(await resource.readLatest(VersionType.SUB_DOCS));
            //console.log(subDocs);
            let i = 0;
            for (const [subDoc, tokens] of subDocs) {
                classifiedSubDocs.push([
                    subDoc,
                    tokens,
                    (attribute in subDoc && subDoc[attribute].match(pattern)) ? 1 : 0
                ]);
                subDocResources.push(resource);
                docPosition.push(i / subDocs.length);
                ++i;
            }
        }
        const time = Date.now();
        const pred = new Predicate(functor);
        const trainingData: TrainingData<F> = []
        const wordTokens = new Array<string[]>(classifiedSubDocs.length);
        const hostTokens = new Array<string>(classifiedSubDocs.length);
        const hostPartTokens = new Array<string[]>(classifiedSubDocs.length);
        const sslFeatures = new Array<string>(classifiedSubDocs.length);
        const pathLengths = new Array<number>(classifiedSubDocs.length);
        const tagFeatures = new Array<string[]>(classifiedSubDocs.length);
        const textAndBasepathDifference = new Array<number>(classifiedSubDocs.length);
        const hostAndBasepathDifference = new Array<number>(classifiedSubDocs.length);
        let i = 0;
        for (const [doc, ] of classifiedSubDocs) {
            tagFeatures[i] = Object.keys(doc).map(tag => `tag:${tag}`);
            let url: ResourceURL;
            const basepath = Tokenizer.charTranslateString(subDocResources[i].basepath());
            if ("href" in doc) {
                try {
                    url = new ResourceURL(doc.href)
                } catch (e) {
                    url = null;
                }
                if (url) {
                    const host = url.host.name;
                    hostTokens[i] = `host:${host}`;
                    sslFeatures[i] = `ssl:${url.ssl}`;
                    pathLengths[i] = url.path.value.split("/").length - 1;
                    const hostPartsForDoc = host.split(".");
                    hostPartTokens[i] = hostPartsForDoc.map(part => `host-part:${part}`);
                    const text = Tokenizer.charTranslateString(doc.text);
                    if (basepath) {
                        const calculator =
                            new DamerauLevenshteinAlgo<string, string[]>(basepath, host);
                        calculator.calculate();
                        const difference = calculator.differenceCoefficient();
                        hostAndBasepathDifference[i] = difference;
                    }
                }
            } else url = null;
            if ("text" in doc) {
                const text = Tokenizer.charTranslateString(doc.text);
                if (basepath) {
                    const calculator =
                        new DamerauLevenshteinAlgo<string, string[]>(basepath, text);
                    calculator.calculate();
                    const difference = calculator.differenceCoefficient();
                    textAndBasepathDifference[i] = difference;
                }
                const tokens = Tokenizer
                    .tokenizeDocument(doc.text)
                    .map(token => `text:${token}`);
                wordTokens[i] = tokens;
            }
            ++i;
        }
        const wordFeatures = frequentFeatures(wordTokens, 10);
        const hostFeatures = frequentFeatures(hostTokens, 3);
        const hostPartFeatures = frequentFeatures(hostPartTokens, 10);
        fancyLog(`Assembling training data from ${classifiedSubDocs.length} documents.`);
        fancyLog(`Word features: ${wordFeatures.size}`);
        i = 0;
        for (const [doc, tokens, c] of classifiedSubDocs) {
            const features: Array<[F, number]> = [];
            features.push([hash("position"), docPosition[i]]);
            SubDocs.tokensToFeatures(tokens, features);
            const wordTokensForDoc = wordTokens[i];
            if (wordTokensForDoc)
                for (const token of wordTokensForDoc)
                    if (wordFeatures.has(token))
                        features.push([hash(token), 1]);
            const hostPartTokensForDoc = hostPartTokens[i];
            if (hostPartTokensForDoc)
                for (const token of hostPartTokensForDoc)
                    if (hostPartFeatures.has(token))
                        features.push([hash(token), 1]);
            const hostTokenForDoc = hostTokens[i];
            if (hostTokenForDoc && hostFeatures.has(hostTokenForDoc))
                features.push([hash(hostTokenForDoc), 1]);
            if (sslFeatures[i] !== undefined)
                features.push([hash(sslFeatures[i]), 1]);
            if (pathLengths[i] !== undefined)
                features.push([hash("path-length"), pathLengths[i]]);
            if (textAndBasepathDifference[i] !== undefined)
                features.push([hash("text-basepath-diff"), textAndBasepathDifference[i]]);
            if (hostAndBasepathDifference[i] !== undefined)
                features.push([hash("host-basepath-diff"), hostAndBasepathDifference[i]]);
            for (const token of tagFeatures[i])
                features.push([hash(token), 1]);
            const point: TrainingDataPoint<F> = [new Map(features), c];
            trainingData.push(point);
            ++i;
        }
        const M = 1000;
        fancyLog(`Building ${M} decision trees with ${trainingData.length} training data points.`);
        const forest = new AdaBoost<F>().train(trainingData, {
            depth: 3,
            trees: M,
        });
        console.log(JSON.stringify(forest.toJSON(), null, 1));
        const buffer = Buffer.from(JSON.stringify(forest.toJSON()));
        await pred.writeVersion(time, VersionType.ADA_BOOST, buffer);
    }
    await Redis.quit();
    (await SQL.db()).destroy();
}

main();
