import { Predicate } from "types/db-objects/Predicate";
import { VersionType } from "types/db-objects/VersionType";
import { Redis } from "common/Redis";
import { SQL } from "common/SQL";
import { selectSubDocTrainingData } from "data";
import { ClassifiedType, SubDocs } from "ml/SubDocs";
import { fancyLog } from "common/util";
import { DecisionTree, TrainingData, TrainingDataPoint } from "ml/DecisionTree";
import { Tokenizer } from "ml/Tokenizer";
import { ResourceURL } from "types/db-objects/ResourceURL";

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
        const trainingData: TrainingData<string, boolean, boolean> = []
        const wordCounts = new Map<string, number>();
        const hostCounts = new Map<string, number>();
        const hostPartCounts = new Map<string, number>();
        const wordTokens: string[][] = new Array<string[]>(classifiedSubDocs.length);
        const hostTokens: string[] = new Array<string>(classifiedSubDocs.length);
        const hostPartTokens: string[][] = new Array<string[]>(classifiedSubDocs.length);
        const sslTokens: string[] = new Array<string>(classifiedSubDocs.length);
        const pathLengths: string[] = new Array<string>(classifiedSubDocs.length);
        const tagTokens: string[][] = new Array<string[]>(classifiedSubDocs.length);
        let i = 0;
        for (const [doc,] of classifiedSubDocs) {
            tagTokens[i] = Object.keys(doc).map(tag => `tag:${tag}`);
            if ("href" in doc) {
                let url: ResourceURL;
                try {
                    url = new ResourceURL(doc.href)
                } catch (e) {
                    url = null;
                }
                if (url) {
                    const host = url.host.name;
                    const count = hostCounts.get(host) || 0;
                    hostCounts.set(host, count + 1);
                    hostTokens[i] = `host:${host}`;
                    sslTokens[i] = `ssl:${url.ssl}`;
                    pathLengths[i] = `path-length:${url.path.value.split("/").length - 1}`;
                    const hostPartsForDoc = host.split(".");
                    hostPartTokens[i] = hostPartsForDoc.map(part => `host-part:${part}`);
                    for (const part of hostPartsForDoc) {
                        const count = hostPartCounts.get(part) || 0;
                        hostPartCounts.set(part, count + 1);
                    }
                }
            }
            if ("text" in doc) {
                const tokens = Tokenizer.tokenizeDocument(doc.text).map(token => `text:${token}`);
                for (const token of tokens) {
                    const count = wordCounts.get(token) || 0
                    wordCounts.set(token, count + 1);
                }
                wordTokens[i] = tokens;
            }
            ++i;
        }
        const wordFeatures = new Set<string>();
        for (const [word, count] of wordCounts.entries())
            if (count > 10)
                wordFeatures.add(word);
        const hostFeatures = new Set<string>();
        for (const [host, count] of hostCounts.entries())
            if (count > 3)
                hostFeatures.add(host);
        const hostPartFeatures = new Set<string>();
        for (const [part, count] of hostPartCounts.entries())
            if (count > 10)
                hostPartFeatures.add(part);
        fancyLog(`Assembling training data from ${classifiedSubDocs.length} documents.`);
        fancyLog(`Word features: ${wordFeatures.size}`);
        i = 0;
        for (const [doc, tokens, c] of classifiedSubDocs) {
            const features: Array<[string, boolean]> = [];
            SubDocs.tokensToFeatures(tokens, features);
            const wordTokensForDoc = wordTokens[i];
            if (wordTokensForDoc)
                for (const token of wordTokensForDoc)
                    if (wordFeatures.has(token))
                        features.push([token, true]);
            const hostPartTokensForDoc = hostPartTokens[i];
            if (hostPartTokensForDoc)
                for (const token of hostPartTokensForDoc)
                    //if (hostPartFeatures.has(token))
                        features.push([token, true]);
            const hostTokenForDoc = hostTokens[i];
            //if (hostTokenForDoc && hostFeatures.has(hostTokenForDoc)) {
            if (hostTokenForDoc) {
                features.push([hostTokenForDoc, true]);
            }
            const sslToken = sslTokens[i];
            if (sslToken)
                features.push([sslToken, true]);
            const pathLength = pathLengths[i];
            if (pathLength)
                features.push([pathLength, true]);
            for (const token of tagTokens[i])
                features.push([token, true]);
            const point: TrainingDataPoint<string, boolean, boolean> = [new Map(features), c];
            trainingData.push(point);
            ++i;
        }
        const M = 50;
        fancyLog(`Building ${M} decision trees with ${trainingData.length} training data points.`);
        const trees = new Array<DecisionTree<string, boolean, boolean>>(M);
        const stringBuilder: Buffer[] = [];
        for (let i = 0; i < M; ++i) {
            fancyLog(`\tBuilding tree ${i}.`);
            const tree = DecisionTree.build<string, boolean, boolean>(trainingData, _ => false, true, 30);
            stringBuilder.push(Buffer.from(JSON.stringify(tree.toJSON())));
            stringBuilder.push(Buffer.from("\n"));
        }
        stringBuilder.pop();
        await pred.writeVersion(
            time, VersionType.RANDOM_FOREST, Buffer.concat(stringBuilder));
    }
    await Redis.quit();
    (await SQL.db()).destroy();
}

main();
