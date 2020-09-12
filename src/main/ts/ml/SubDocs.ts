import { Dictionary, bytesToBigInt, fancyLog } from "utils/alpha";
import { Tokenizer } from "./Tokenizer";
import { defaultHash } from "common/hashing";
import { ResourceURL } from "types/db-objects/ResourceURL";
import { DamerauLevenshteinAlgo } from "utils/DamerauLevenshteinAlgo";
import { TrainingData } from "./TrainingData";

export type UnlabelledSubDoc = [Dictionary<string>, string[]];
export type UnlabelledSubDocs = UnlabelledSubDoc[];
export type LabelledSubDoc = [Dictionary<string>, string[], number]
export type LabelledSubDocs = LabelledSubDoc[];

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

function hash(str: string): F {
    //return bytesToBigInt(defaultHash("", str))
    return str;
}

type F = string;
export class SubDocs {
    static parseSubDocs(buffer: Buffer) {
        const lines = buffer.toString().split(/\n+/);
        const subDocs: UnlabelledSubDocs = [];
        for (const line of lines) {
            const [ subDocStr, tokensStr ] = line.split(/\t+/, 2);
            const tokens = tokensStr.split(/ +/);
            const subDoc = JSON.parse(subDocStr);
            subDocs.push([subDoc, tokens])
        }

        return subDocs;
    }
    static parseClassifiedSubDocs(buffer: Buffer) {
        const lines = buffer.toString().split(/\n+/);
        const subDocs: [Dictionary<string>, string[], boolean][] = [];
        for (const line of lines) {
            const [ subDocStr, tokensStr, c ] = line.split(/\t+/, 3);
            const tokens = tokensStr.split(/ +/);
            const subDoc = JSON.parse(subDocStr);
            subDocs.push([subDoc, tokens, c === "1" ? true : false]);
        }

        return subDocs;
    }
    private static readonly TAB = Buffer.from("\t");
    private static readonly NL = Buffer.from("\n");
    static subDocsToBuffer(subDocs: UnlabelledSubDocs) {
        const stringBuilder = [];
        for (const [features, tokens] of subDocs) {
            stringBuilder.push(Buffer.from(JSON.stringify(features)));
            stringBuilder.push(SubDocs.TAB);
            stringBuilder.push(Buffer.from(tokens.join(" ")));
            stringBuilder.push(SubDocs.NL);
        }
        stringBuilder.pop();

        return Buffer.concat(stringBuilder);
    }
    private static readonly NIL = Buffer.from("0");
    private static readonly ONE = Buffer.from("1");
    static classifiedSubDocsToBuffer(subDocs: LabelledSubDocs) {
        const stringBuilder = [];
        for (const [features, tokens, c] of subDocs) {
            stringBuilder.push(Buffer.from(JSON.stringify(features)));
            stringBuilder.push(this.TAB);
            stringBuilder.push(Buffer.from(tokens.join(" ")));
            stringBuilder.push(this.TAB);
            stringBuilder.push(c ? SubDocs.ONE : SubDocs.NIL)
            stringBuilder.push(this.NL);
        }
        stringBuilder.pop();

        return Buffer.concat(stringBuilder);
    }

    static tokensToFeatures(tokens: string[], features: [string, number][] = [], text: string = null) {
        for (const token of tokens) {
            for (const feature of token.split(/(?=[#.])/g)) {
                if (feature.length < 26 && !feature.match(/^(.(root)?page-)|(#)/))
                    features.push([SubDocs.hashFeatureName(feature), 1]);
            }
        }
        if (text) {
            const tokens = Tokenizer.tokenizeDocument(text);
            for (const token of tokens) {
                features.push([SubDocs.hashFeatureName(`text:${token}`), 1]);
            }
        }

        return features;
    }

    static hashFeatureName(str: string) {
        return str;
        //return bytesToBigInt(defaultHash("", str))
    }

    static resourceSubDocsToTrainingData(subDocs: LabelledSubDocs, resource: ResourceURL) {
        const length = subDocs.length;
        const wordTokens = new Array<string[]>(length);
        const hostTokens = new Array<string>(length);
        const hostPartTokens = new Array<string[]>(length);
        const sslFeatures = new Array<string>(length);
        const pathLengths = new Array<number>(length);
        const tagFeatures = new Array<string[]>(length);
        const textAndBasepathDifference = new Array<number>(length);
        const hostAndBasepathDifference = new Array<number>(length);
        let i = 0;
        for (const [doc, ] of subDocs) {
            tagFeatures[i] = Object.keys(doc).map(tag => `tag:${tag}`);
            let url: ResourceURL;
            const basepath = Tokenizer.charTranslateString(resource.basepath());
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
                    if (basepath) {
                        const calculator =
                            new DamerauLevenshteinAlgo<string, string[]>(basepath, host);
                        calculator.calculate();
                        const similarity = calculator.similarityCoefficient();
                        hostAndBasepathDifference[i] = similarity;
                    }
                }
            } else url = null;
            if ("text" in doc) {
                const text = Tokenizer.charTranslateString(doc.text);
                if (basepath) {
                    const calculator =
                        new DamerauLevenshteinAlgo<string, string[]>(basepath, text);
                    calculator.calculate();
                    const difference = calculator.similarityCoefficient();
                    textAndBasepathDifference[i] = difference;
                }
                const tokens = Tokenizer
                    .tokenizeDocument(doc.text)
                    .map(token => `text:${token}`);
                wordTokens[i] = tokens;
            }
            ++i;
        }
        const data = TrainingData.initWithLength<F>(length);
        for (let i = 0; i < length; ++i) {
            const [doc, tokens, c] = subDocs[i]
            const features: Array<[F, number]> = [];
            features.push([hash("position"), i / length]);
            SubDocs.tokensToFeatures(tokens, features);
            const wordTokensForDoc = wordTokens[i];
            if (wordTokensForDoc)
                for (const token of wordTokensForDoc)
                    features.push([hash(token), 1]);
            const hostPartTokensForDoc = hostPartTokens[i];
            if (hostPartTokensForDoc)
                for (const token of hostPartTokensForDoc)
                    features.push([hash(token), 1]);
            const hostTokenForDoc = hostTokens[i];
            if (hostTokenForDoc)
                features.push([hash(hostTokenForDoc), 1]);
            if (sslFeatures[i] !== undefined)
                features.push([hash(sslFeatures[i]), 1]);
            if (pathLengths[i] !== undefined)
                features.push([hash("path-length"), pathLengths[i]]);
            if (textAndBasepathDifference[i] !== undefined)
                features.push([hash("text-basepath-similarity"), textAndBasepathDifference[i]]);
            if (hostAndBasepathDifference[i] !== undefined)
                features.push([hash("host-basepath-similarity"), hostAndBasepathDifference[i]]);
            for (const token of tagFeatures[i])
                features.push([hash(token), 1]);
            data.features[i] = new Map(features);
            data.labels[i] = c;
            data.weights[i] = 1 / length;
        }
        
        return data;
    }

    static resourceSubDocsToPredictionFeatures(subDocs: UnlabelledSubDocs, resource: ResourceURL) {
        const length = subDocs.length;
        const wordTokens = new Array<string[]>(length);
        const hostTokens = new Array<string>(length);
        const hostPartTokens = new Array<string[]>(length);
        const sslFeatures = new Array<string>(length);
        const pathLengths = new Array<number>(length);
        const tagFeatures = new Array<string[]>(length);
        const textAndBasepathDifference = new Array<number>(length);
        const hostAndBasepathDifference = new Array<number>(length);
        let i = 0;
        for (const [doc, ] of subDocs) {
            tagFeatures[i] = Object.keys(doc).map(tag => `tag:${tag}`);
            let url: ResourceURL;
            const basepath = Tokenizer.charTranslateString(resource.basepath());
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
                    if (basepath) {
                        const calculator =
                            new DamerauLevenshteinAlgo<string, string[]>(basepath, host);
                        calculator.calculate();
                        const similarity = calculator.similarityCoefficient();
                        hostAndBasepathDifference[i] = similarity;
                    }
                }
            } else url = null;
            if ("text" in doc) {
                const text = Tokenizer.charTranslateString(doc.text);
                if (basepath) {
                    const calculator =
                        new DamerauLevenshteinAlgo<string, string[]>(basepath, text);
                    calculator.calculate();
                    const difference = calculator.similarityCoefficient();
                    textAndBasepathDifference[i] = difference;
                }
                const tokens = Tokenizer
                    .tokenizeDocument(doc.text)
                    .map(token => `text:${token}`);
                wordTokens[i] = tokens;
            }
            ++i;
        }
        const allFeatures: Map<string, number>[] = [];
        for (let i = 0; i < length; ++i) {
            const [doc, tokens] = subDocs[i]
            const features: Array<[F, number]> = [];
            features.push([hash("position"), i / length]);
            SubDocs.tokensToFeatures(tokens, features);
            const wordTokensForDoc = wordTokens[i];
            if (wordTokensForDoc)
                for (const token of wordTokensForDoc)
                    features.push([hash(token), 1]);
            const hostPartTokensForDoc = hostPartTokens[i];
            if (hostPartTokensForDoc)
                for (const token of hostPartTokensForDoc)
                    features.push([hash(token), 1]);
            const hostTokenForDoc = hostTokens[i];
            if (hostTokenForDoc)
                features.push([hash(hostTokenForDoc), 1]);
            if (sslFeatures[i] !== undefined)
                features.push([hash(sslFeatures[i]), 1]);
            if (pathLengths[i] !== undefined)
                features.push([hash("path-length"), pathLengths[i]]);
            if (textAndBasepathDifference[i] !== undefined)
                features.push([hash("text-basepath-similarity"), textAndBasepathDifference[i]]);
            if (hostAndBasepathDifference[i] !== undefined)
                features.push([hash("host-basepath-similarity"), hostAndBasepathDifference[i]]);
            for (const token of tagFeatures[i])
                features.push([hash(token), 1]);
            allFeatures.push(new Map(features));
        }
        
        return allFeatures;
    }
}