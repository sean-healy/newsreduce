import { Predicate } from "types/db-objects/Predicate";
import { VersionType } from "types/db-objects/VersionType";
import { Redis } from "common/Redis";
import { SQL } from "common/SQL";
import { selectSubDocTrainingData } from "data";
import { ClassifiedType, SubDocs } from "ml/SubDocs";
import { fancyLog } from "utils/alpha";
import { DamerauLevenshteinAlgo } from "utils/DamerauLevenshteinAlgo";
import { Tokenizer } from "ml/Tokenizer";
import { ResourceURL } from "types/db-objects/ResourceURL";
import { TrainingData } from "ml/trees/TrainingData";
import { TrainingDataPoint } from "ml/trees/TrainingDataPoint";
import { RandomForest } from "ml/trees/RandomForest";
import { NonForest } from "ml/trees/NonForest";

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

export async function main() {
    const data = await selectSubDocTrainingData();
    for (const functor in data) {
        fancyLog(`Training for predicate: ${functor}`);
        const classifiedSubDocs: ClassifiedType = [];
        const predicateData = data[functor];
        for (const { resource, attribute, pattern } of predicateData) {
            //fancyLog(`\t${resource.toURL()}`);
            const subDocs = SubDocs.parseSubDocs(await resource.readLatest(VersionType.SUB_DOCS));
            //console.log(subDocs);
            for (const [subDoc, tokens] of subDocs)
                classifiedSubDocs.push([subDoc, tokens, !!(attribute in subDoc && subDoc[attribute].match(pattern))]);
        }
        const time = Date.now();
        const pred = new Predicate(functor);
        await pred.writeVersion(
            time, VersionType.CLASSIFIED_SUB_DOCS, SubDocs.classifiedSubDocsToBuffer(classifiedSubDocs));
        const trainingData: TrainingData<string, boolean | number, boolean> = []
        const wordTokens = new Array<string[]>(classifiedSubDocs.length);
        const hostTokens = new Array<string>(classifiedSubDocs.length);
        const hostPartTokens = new Array<string[]>(classifiedSubDocs.length);
        const sslFeatures = new Array<string>(classifiedSubDocs.length);
        const pathLengths = new Array<number>(classifiedSubDocs.length);
        const tagFeatures = new Array<string[]>(classifiedSubDocs.length);
        const textAndBasepathDifference = new Array<number>(classifiedSubDocs.length);
        let i = 0;
        for (const [doc,] of classifiedSubDocs) {
            tagFeatures[i] = Object.keys(doc).map(tag => `tag:${tag}`);
            let url: ResourceURL;
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
                }
            } else url = null;
            if ("text" in doc) {
                const text = doc.text;
                if (url) {
                    const basepath = url.basepath();
                    if (basepath) {
                        const calculator =
                            new DamerauLevenshteinAlgo<string, string[]>(basepath, text);
                        calculator.calculate();
                        const difference = calculator.differenceCoefficient();
                        textAndBasepathDifference[i] = difference;
                    }
                }
                const tokens = Tokenizer
                    .tokenizeDocument(text)
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
            const features: Array<[string, boolean | number]> = [];
            SubDocs.tokensToFeatures(tokens, features);
            const wordTokensForDoc = wordTokens[i];
            if (wordTokensForDoc)
                for (const token of wordTokensForDoc)
                    if (wordFeatures.has(token))
                        features.push([token, true]);
            const hostPartTokensForDoc = hostPartTokens[i];
            if (hostPartTokensForDoc)
                for (const token of hostPartTokensForDoc)
                    if (hostPartFeatures.has(token))
                        features.push([token, true]);
            const hostTokenForDoc = hostTokens[i];
            if (hostTokenForDoc && hostFeatures.has(hostTokenForDoc))
                features.push([hostTokenForDoc, true]);
            if (sslFeatures[i])
                features.push([sslFeatures[i], true]);
            if (pathLengths[i])
                features.push(["path-length", pathLengths[i]]);
            if (textAndBasepathDifference[i])
                features.push(["text-basepath-diff", textAndBasepathDifference[i]]);
            for (const token of tagFeatures[i])
                features.push([token, true]);
            const point: TrainingDataPoint<string, boolean | number, boolean> = [new Map(features), c];
            trainingData.push(point);
            ++i;
        }
        const M = 2;
        fancyLog(`Building ${M} decision trees with ${trainingData.length} training data points.`);
//        const forest = new RandomForest<string, boolean | number, boolean>().train(trainingData, {
        const forest = new NonForest<string, boolean | number, boolean>().train(trainingData, {
            depth: 10,
            trees: M,
        });
        const buffer = Buffer.from(JSON.stringify(forest.toJSON()));
        await pred.writeVersion(time, VersionType.RANDOM_FOREST, buffer);
    }
    await Redis.quit();
    (await SQL.db()).destroy();
}

main();
