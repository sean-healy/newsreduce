import { Predicate } from "types/db-objects/Predicate";
import { VersionType } from "types/db-objects/VersionType";
import { selectDefiniteNewsSourceWikis } from "data";
import { ResourceURL } from "types/db-objects/ResourceURL";
import { SubDocs } from "ml/SubDocs";
import { Dictionary, fancyLog } from "utils/alpha";
import { Redis } from "common/Redis";
import { SQL } from "common/SQL";
import { Ensemble } from "ml/classifiers/Ensemble";
import { AdaBoost } from "ml/classifiers/dt/forests/AdaBoost";

export async function main() {
    const buffer =
        await Predicate.SUB_DOC_IS_NEWS_SOURCE_HOMEPAGE.readLatest(VersionType.ADA_BOOST);
    fancyLog(`Decision tree read from disk (${buffer.length}).`);
    const forest = new AdaBoost().parse(buffer);
    console.log(forest)
    if (true) {
    const urls = await selectDefiniteNewsSourceWikis();
    for (const url of urls) {
        const resource = new ResourceURL(url);
        const subDocs = SubDocs.parseSubDocs(await resource.readLatest(VersionType.SUB_DOCS));
        const candidates: [number, Dictionary<string>][] = [];
        const testData = SubDocs.resourceSubDocsToTestData(subDocs, resource);
        for (const [subDoc, features] of testData) {
            const response = forest.fuzzyClassify(features).find(([t, ]) => t);
            if (response) {
                const [, p] = response;
                if (p > 0.5) {
                    candidates.push([p, subDoc]);
                }
            }
        }
        if (candidates.length) {
            candidates.sort((a, b) => b[0] - a[0]);
            const topCandidate = candidates[0];
            const homepage = topCandidate[1].href;
            console.log(`${url}\t${homepage}\t${topCandidate[0]}`);
        }
    }
    }
    await Redis.quit();
    await SQL.destroy();
}

main();