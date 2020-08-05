import { Predicate, PredicateID } from "types/db-objects/Predicate";
import { selectBOWsForRelation } from "data";
import { ResourceID } from "types/db-objects/ResourceURL";
import { VersionType } from "types/db-objects/VersionType";
import { BagOfWords } from "types/ml/BagOfWords";
import { Redis } from "common/Redis";
import { SQL } from "common/SQL";
import { PromisePool } from "common/PromisePool";

export async function main() {
    const predicates = await new Predicate().selectAll();
    const pool = new PromisePool(100);
    for (let {id, value} of predicates) {
        console.log(`Processing word counts across relation: ${value}.`);
        const negativeBOW = new BagOfWords();
        const positiveBOW = new BagOfWords();
        id = BigInt(id);
        const negativeCases = await selectBOWsForRelation(id, false);
        console.log(`Negative cases: ${negativeCases.length}.`);
        for (const [resource, time] of negativeCases) {
            const buffer = await new ResourceID(resource).read(time, VersionType.BAG_OF_WORDS);
            if (buffer) {
                const bow = new BagOfWords().fromBuffer(buffer);
                for (const [wordID, count] of bow.bag)
                    negativeBOW.registerID(wordID, count);
            }
        }
        const positiveCases = await selectBOWsForRelation(id, true);
        console.log(`Positive cases: ${positiveCases.length}.`);
        for (const [resource, time] of positiveCases) {
            const buffer = await new ResourceID(resource).read(time, VersionType.BAG_OF_WORDS);
            if (buffer) {
                const bow = new BagOfWords().fromBuffer(buffer);
                for (const [wordID, count] of bow.bag)
                    positiveBOW.registerID(wordID, count);
            }
        }
        const allBOW = positiveBOW.union(negativeBOW);
        positiveBOW.calculateAndSetLengthBytes();
        negativeBOW.calculateAndSetLengthBytes();
        allBOW.calculateAndSetLengthBytes();
        const now = Date.now();

        const { length: posBOWLength, file: posBOWFile } = positiveBOW.toBufferFile();
        if (posBOWLength >= 0)
            await pool.registerPromise(new PredicateID(id)
                .replaceVersion(now, VersionType.TRUE_BAG_OF_WORDS, posBOWFile, posBOWLength));
        const { length: negBOWLength, file: negBOWFile } = negativeBOW.toBufferFile();
        if (negBOWLength >= 0)
            await pool.registerPromise(new PredicateID(id)
                .replaceVersion(now, VersionType.FALSE_BAG_OF_WORDS, negBOWFile, negBOWLength));
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