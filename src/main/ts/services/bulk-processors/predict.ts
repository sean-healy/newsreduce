import { Predicate } from "types/db-objects/Predicate";
import { VersionType } from "types/db-objects/VersionType";
import { selectDefiniteNewsSourceWikis } from "data";
import { ResourceURL } from "types/db-objects/ResourceURL";
import { SubDocs } from "ml/SubDocs";
import { Dictionary, fancyLog } from "utils/alpha";
import { Redis } from "common/Redis";
import { SQL } from "common/SQL";
import { DecisionForest } from "ml/trees/DecisionForest";

export async function main() {
    const buffer =
        await Predicate.SUB_DOC_IS_NEWS_SOURCE_HOMEPAGE.readLatest(VersionType.RANDOM_FOREST);
    fancyLog(`Decision tree read from disk (${buffer.length}).`);
    const forest = DecisionForest.parse<string, boolean | number, boolean>(buffer);
    const urls = await selectDefiniteNewsSourceWikis();
    for (const url of urls) {
        const subDocs = SubDocs.parseSubDocs(await new ResourceURL(url).readLatest(VersionType.SUB_DOCS));
        const candidates: [number, Dictionary<string>][] = [];
        for (const [subDoc, tokens] of subDocs) {
            const features = new Map(SubDocs.tokensToFeatures(tokens));
            const response = forest.fuzzyClassify(features, _ => false).find(([t, ]) => t);
            if (response) {
                const p = response[1];
                candidates.push([p, subDoc]);
            }
        }
        if (candidates.length) {
            candidates.sort((a, b) => b[0] - a[0]);
            //console.log(candidates);
            for (let i = 0; i < 7 && i < candidates.length; ++i) {
                const topCandidate = candidates[i];
                const homepage = topCandidate[1].href;
                console.log(`${url}\t${homepage}\t${topCandidate[0]}`);
            }
        }
    }
    await Redis.quit();
    await SQL.destroy();
}

main();