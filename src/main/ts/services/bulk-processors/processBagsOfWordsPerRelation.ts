import { Predicate, PredicateID } from "types/db-objects/Predicate";
import { selectBOWsForRelation } from "data";
import { ResourceID } from "types/db-objects/ResourceURL";
import { VersionType } from "types/db-objects/VersionType";
import { BagOfWords } from "ml/bags/BagOfWords";
import { Redis } from "common/Redis";
import { SQL } from "common/SQL";
import { PromisePool } from "common/PromisePool";
import { ConditionalWordFrequencyByID } from "types/db-objects/ConditionalWordFrequency";
import { linerLog } from "utils/alpha";
import { Bag } from "ml/bags/Bag";

export async function main() {
    const predicates = await new Predicate().selectAll();
    const pool = new PromisePool(100);
    for (let { id, functor } of predicates) {
        console.log(`Processing word counts across relation: ${functor}.`);
        const negativeBOW = new BagOfWords();
        const positiveBOW = new BagOfWords();
        id = BigInt(id);
        const negativeCases = await selectBOWsForRelation(id, false);
        let i = 0;
        let start = Date.now();
        for (const [resource, time] of negativeCases) {
            linerLog(start, i++, negativeCases.length);
            const buffer = await new ResourceID(resource).read(time, VersionType.BAG_OF_WORDS);
            if (buffer) {
                const bow = new BagOfWords().fromBuffer(buffer);
                for (const [wordID, count] of bow.bag)
                    negativeBOW.registerID(wordID, count);
            }
        }
        process.stdout.write("\n");
        const positiveCases = await selectBOWsForRelation(id, true);
        i = 0;
        start = Date.now();
        for (const [resource, time] of positiveCases) {
            linerLog(start, i++, positiveCases.length);
            const buffer = await new ResourceID(resource).read(time, VersionType.BAG_OF_WORDS);
            if (buffer) {
                const bow = new BagOfWords().fromBuffer(buffer);
                for (const [wordID, count] of bow.bag)
                    positiveBOW.registerID(wordID, count);
            }
        }
        process.stdout.write("\n");
        const allBOW = positiveBOW.union(negativeBOW);
        Bag.termsByInformationGain(positiveCases.length, negativeCases.length, positiveBOW, negativeBOW, allBOW);
        positiveBOW.calculateAndSetLengthBytes();
        negativeBOW.calculateAndSetLengthBytes();
        allBOW.calculateAndSetLengthBytes();
        for (const [wordID, count] of positiveBOW.bag)
            new ConditionalWordFrequencyByID(id, true, wordID, count).enqueueInsert({ recursive: true });
        for (const [wordID, count] of negativeBOW.bag)
            new ConditionalWordFrequencyByID(id, false, wordID, count).enqueueInsert({ recursive: true });

        const now = Date.now();
        const { length: posBOWLength, file: posBOWFile } = positiveBOW.toBufferFile();
        if (posBOWLength >= 0)
            await pool.registerPromise(new PredicateID(id)
                .replaceVersion(now, VersionType.BAG_OF_WORDS, posBOWFile, posBOWLength, Predicate.TRUE_SUFFIX));
        const { length: negBOWLength, file: negBOWFile } = negativeBOW.toBufferFile();
        if (negBOWLength >= 0)
            await pool.registerPromise(new PredicateID(id)
                .replaceVersion(now, VersionType.BAG_OF_WORDS, negBOWFile, negBOWLength, Predicate.FALSE_SUFFIX));
        const { length: allBOWLength, file: allBOWFile } = allBOW.toBufferFile();
        if (allBOWLength >= 0)
            await pool.registerPromise(new PredicateID(id)
                .replaceVersion(now, VersionType.BAG_OF_WORDS, allBOWFile, allBOWLength));
    }
    await pool.flush();
    await Redis.quit();
    (await SQL.db()).destroy();
}

main();
