import { Predicate } from "types/db-objects/Predicate";
import { VersionType } from "types/db-objects/VersionType";
import { Redis } from "common/Redis";
import { SQL } from "common/SQL";
import { selectSubDocTrainingData } from "data";
import { LabelledSubDocs, SubDocs } from "ml/SubDocs";
import { fancyLog } from "utils/alpha";
import { AdaBoost } from "ml/dt/forests/AdaBoost";
import { TrainingData } from "ml/dt/TrainingData";

type F = string;
export async function main() {
    const subDocsTrainingData = await selectSubDocTrainingData();
    for (const functor in subDocsTrainingData) {
        fancyLog(`Training for predicate: ${functor}`);
        const predicateData = subDocsTrainingData[functor];
        const resourceData = new Array<TrainingData<F>>()
        for (const { resource, attribute, pattern } of predicateData) {
            const classifiedSubDocs: LabelledSubDocs = [];
            const subDocs = SubDocs.parseSubDocs(await resource.readLatest(VersionType.SUB_DOCS));
            for (const [subDoc, tokens] of subDocs) {
                classifiedSubDocs.push([
                    subDoc,
                    tokens,
                    (attribute in subDoc && subDoc[attribute].match(pattern)) ? 1 : 0
                ]);
            }
            resourceData.push(SubDocs.resourceSubDocsToTrainingData(classifiedSubDocs, resource));
        }
        const data = TrainingData.concat<F>(...resourceData);
        const { trainingData, testData } = data.split(0.7);
        const M = 200;
        fancyLog(`Building ${M} decision trees with ${data.length} training data points.`);
        const forest = new AdaBoost<F>().train({
            data: trainingData,
            depth: 3,
            trees: M,
            testData,
        });
        const buffer = Buffer.from(JSON.stringify(forest.toJSON()));
        const pred = new Predicate({ functor });
        const time = Date.now();
        await pred.writeVersion(time, VersionType.ADA_BOOST, buffer);
    }
    await Redis.quit();
    (await SQL.db()).destroy();
}

main();
