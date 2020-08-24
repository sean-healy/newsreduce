import { DBObject } from "types/DBObject";
import { BinaryBag } from "ml/bags/BinaryBag";
import * as util from "utils/alpha";
import { randomBufferFile } from "file";
import fs from "fs";
import { Predicate } from "types/db-objects/Predicate";
import { VersionType } from "types/db-objects/VersionType";

export class Bag<T extends DBObject<T>, V = string, B extends Bag<T, V, B> = any> {
    readonly bag: Map<bigint, number>;
    readonly objects: Map<bigint, T>;
    readonly builder: (value: V) => T;
    lengthBytes: number;

    constructor(
        builder: (value: V) => T = null,
        bag: Map<bigint, number> = new Map(),
        lengthBytes: number = 2,
    ) {
        this.bag = bag;
        this.builder = builder;
        this.objects = new Map();
        this.lengthBytes = lengthBytes;
    }

    register(value: V, count = 1) {
        const obj = this.builder(value);
        const id = obj.getID();
        if (id === null) {
            util.fancyLog("error while registering hit with bag: id null")
            util.fancyLog(JSON.stringify(value));
        }
        this.objects.set(id, obj);
        this.registerID(id, count);
    }
    registerID(id: bigint, count = 1) {
        if (this.bag.has(id)) this.bag.set(id, this.bag.get(id) + count);
        else this.bag.set(id, count);
    }
    toBinaryBag() {
        return new BinaryBag(this.builder, new Set(this.bag.keys()));
    }
    toBuffer() {
        const ids = [...this.bag.keys()];
        const fileData = Buffer.alloc(1 + this.bag.size * (12 + this.lengthBytes));
        fileData[0] = this.lengthBytes;
        let offset = 1;
        const max = 2 ** (this.lengthBytes * 8) - 1;
        for (const id of ids.sort(util.CMP_BIG_INT)) {
            util.writeBigUInt96BE(id, fileData, offset);
            offset += 12;
            const count = Math.min(this.bag.get(id), max);
            util.writeAnyNumberBE(count, this.lengthBytes, fileData, offset);
            offset += this.lengthBytes;
        }

        return fileData;
    }
    private total: number = null;
    getTotal() {
        if (this.total === null) {
            let total = 0;
            for (const count of this.bag.values()) total += count;
            this.total = total;
        }

        return this.total;
    }
    termProbability(term: V) {
        return this.termIDProbability(this.builder(term).getID());
    }
    termIDProbability(termID: bigint) {
        const count = this.bag.get(termID) || 0;
        return count / this.getTotal();
    }
    toBufferFile() {
        let length = 0;
        let file: string;
        const max = 2 ** (this.lengthBytes * 8) - 1;
        try {
            file = randomBufferFile();
            const fd = fs.openSync(file, "w");
            const lengthBytesBuffer = Buffer.alloc(1);
            lengthBytesBuffer[0] = this.lengthBytes;
            fs.writeSync(fd, lengthBytesBuffer);
            length += 1;
            const ids = [...this.bag.keys()].sort(util.CMP_BIG_INT);
            for (const id of ids) {
                fs.writeSync(fd, util.writeBigUInt96BE(id));
                length += 12;
                const count = Math.min(this.bag.get(id), max);
                fs.writeSync(fd, util.writeAnyNumberBE(count, this.lengthBytes));
                length += this.lengthBytes;
            }
            fs.closeSync(fd);
        } catch (e) {
            util.fancyLog("error during BOW to file:");
            util.fancyLog(JSON.stringify(e));
            length = -1;
            file = null;
        }

        return { length, file };
    }
    build(bag: Map<bigint, number>, lengthBytes: number = 2): B {
        return new Bag(this.builder, bag, lengthBytes) as B;
    }
    toFrequenciesBag() {
        const frequencies = new Map<bigint, number>();
        let total = 0;
        for (const count of this.bag.values()) total += count;
        for (const [id, count] of this.bag)
            frequencies.set(id, count / total);

        return this.build(frequencies, 8);
    }
    fromBuffer(buffer: Buffer) {
        const bag = new Map<bigint, number>();
        const bufferLength = buffer.length;
        const lengthBytes = buffer[0];
        let offset = 1;
        while (offset < bufferLength) {
            const idBytes = buffer.slice(offset, offset + 12);
            const id = util.bytesToBigInt(idBytes);
            offset += 12;
            const countBytes = buffer.slice(offset, offset + lengthBytes)
            const count = util.bytesToNumber(countBytes);
            offset += lengthBytes;
            bag.set(id, count);
        }

        return this.build(bag, lengthBytes);
    }

    toString() {
        const ids = [...this.bag.keys()].sort(util.CMP_BIG_INT);
        let str = "";
        for (const id of ids)
            str += `${id}`.padStart(29, "0") + " " + this.bag.get(id).toString(16).padStart(this.lengthBytes * 2, "0") + "\n";

        return str;
    }

    calculateAndSetLengthBytes() {
        let max = 1;
        for (const count of this.bag.values()) if (count > max) max = count;
        const range = max + 1;
        const lengthBytes = Math.ceil((Math.log(range) / Math.log(2)) / 8);
        this.lengthBytes = lengthBytes;
    }

    union<T extends DBObject<T>, V, B extends Bag<T, V, B>>(...bags: B[]) {
        const newBag = new Map<bigint, number>();
        for (const [id, count] of this.bag)
            newBag.set(id, count);
        for (const bag of bags)
            for (const [id, count] of bag.bag) {
                const prevCount = newBag.get(id) || 0;
                const nextCount = prevCount + count;
                newBag.set(id, nextCount);
            }
        const newBagWrapper = this.build(newBag);
        for (const [key, val] of this.objects)
            newBagWrapper.objects.set(key, val);
        for (const bag of bags)
            for (const [key, val] of bag.objects)
                newBagWrapper.objects.set(key, val as any);
        newBagWrapper.calculateAndSetLengthBytes();

        return newBagWrapper;
    }
    registerAll<T extends DBObject<T>, V, B extends Bag<T, V, B>>(...bags: B[]) {
        for (const bag of bags) {
            for (const [id, count] of bag.bag) {
                const prevCount = this.bag.get(id) || 0;
                const nextCount = prevCount + count;
                this.bag.set(id, nextCount);
                this.objects.set(id, bag.objects.get(id) as any);
            }
        }
    }

    static termsByInformationGain<T extends DBObject>(
        positiveCases: number,
        negativeCases: number,
        positiveBOW: Bag<T>,
        negativeBOW: Bag<T>,
        allBOW: Bag<T>,
    ) {
        const probPositive = positiveCases / (positiveCases + negativeCases);
        const terms = new Set([...negativeBOW.bag.keys(), ...positiveBOW.bag.keys()]);
        const termsByIG = [];
        for (const term of terms) {
            const probT = allBOW.termIDProbability(term);
            let informationGain = 0;
            const cases = [{ bag: positiveBOW, bagP: probPositive }, { bag: negativeBOW, bagP: 1 - probPositive}];
            outer: for (const { bag, bagP } of cases) {
                const countTInBag = bag.bag.get(term) || 0;
                const countNotTInBag = bag.getTotal() - countTInBag;
                const cases = [{ termCount: countTInBag, termP: probT }, { termCount: countNotTInBag, termP: 1 - probT }];
                for (const { termCount, termP } of cases) {
                    if (!termCount) {
                        informationGain = 0;
                        break outer;
                    }
                    const jointProb = termCount / allBOW.getTotal();
                    const mutualInformation = jointProb * Math.log(jointProb / (termP * bagP));
                    informationGain += mutualInformation;
                    if (!informationGain && informationGain != 0) {
                        console.log(termCount, bagP, termP);
                        return;
                    }
                }
            }
            termsByIG.push([informationGain, term]);
        }
        termsByIG.sort((a, b) => a[0] - b[0]);

        return termsByIG;
    }
    static trimFeaturesByIG<T extends DBObject>(
        positiveCases: number,
        negativeCases: number,
        positiveBOW: Bag<T>,
        negativeBOW: Bag<T>,
        allBOW: Bag<T>,
        n: number,
    ) {
        const termsByIG = Bag.termsByInformationGain(positiveCases, negativeCases, positiveBOW, negativeBOW, allBOW).slice(-n);
        const reducedFeatures = new Set(termsByIG.slice(0, n).map(([, term]) => term));
        for (const term of positiveBOW.bag.keys())
            if (!reducedFeatures.has(term)) positiveBOW.bag.delete(term);
        for (const term of negativeBOW.bag.keys())
            if (!reducedFeatures.has(term)) negativeBOW.bag.delete(term);
        for (const term of allBOW.bag.keys())
            if (!reducedFeatures.has(term)) allBOW.bag.delete(term);
    }

    static predict<T, S extends DBObject<S>>(posBag: Bag<S>, negBag: Bag<S>, input: [T, Bag<S>][]) {
        const results: [T, number][] = [];
        let i = 0;
        for (const [doc, bag] of input) {
            let score = 0;
            for (const [ termID, count ] of bag.bag) {
                const posCount = posBag.bag.get(termID) || 0;
                const posTotal = posBag.getTotal();
                const negCount = negBag.bag.get(termID) || 0;
                const negTotal = negBag.getTotal();
                const pPos = (posCount + 1) / (posTotal + 2);
                const pNeg = (negCount + 1) / (negTotal + 2);
                score += Math.log((pPos * (1 - pNeg)) / (pNeg * (1 - pPos)));
            }
            results.push([doc, score]);
        }
        results.sort((a, b) => a[1] - b[1]);

        return results;
    }
}
