import { Dictionary } from "common/util";
import { Tokenizer } from "./Tokenizer";
export type Type = [Dictionary<string>, string[]][];
export type ClassifiedType = [Dictionary<string>, string[], boolean][];
export class SubDocs {
    static parseSubDocs(buffer: Buffer) {
        const lines = buffer.toString().split(/\n+/);
        const subDocs: [Dictionary<string>, string[]][] = [];
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
    static subDocsToBuffer(subDocs: Type) {
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
    static classifiedSubDocsToBuffer(subDocs: ClassifiedType) {
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

    static tokensToFeatures(tokens: string[], features: [string, boolean][] = [], text: string = null) {
        for (const token of tokens) {
            for (const feature of token.split(/(?=[#.])/g)) {
                if (feature.length < 26 && !feature.match(/^(.(root)?page-)|(#)/))
                    features.push([feature, true]);
            }
        }
        if (text) {
            const tokens = Tokenizer.tokenizeDocument(text);
            for (const token of tokens) {
                features.push([`text:${token}`, true]);
            }
        }

        return features;
    }
}