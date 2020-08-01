import { selectBagOfWordsByHost } from "data";
import { ResourceID } from "types/objects/ResourceURL";
import { VersionType } from "types/objects/VersionType";
import { SQL } from "common/SQL";
import { bytesToBigInt, bytesToNumber, fancyLog } from "common/util";
import { Bag } from "types/Bag";
import { WordID } from "types/objects/Word";
import { HostID } from "types/objects/Host";
import { Redis } from "common/Redis";

async function main() {
    const bags = await selectBagOfWordsByHost();
    for (const host of bags.keys()) {
        const hostBags = bags.get(host);
        const hostBag = new Bag<WordID, bigint>(value => new WordID(value), new Map(), 4);
        let i = 0;
        for (const [resource, time] of hostBags) {
            const input = (await new ResourceID(resource)
                .stream(time, VersionType.BAG_OF_WORDS))
            await new Promise<void>(res => {
                let lengthBytes = null;
                input.on('readable', () => {
                    if (!lengthBytes) {
                        const data = input.read(1);
                        if (data) {
                            lengthBytes = data[0];
                            if ((i++ & 0b111111) === 0) {
                                console.log(`Lexicon size: ${hostBag.bag.size}.`);
                            }
                        }
                    }
                    let data: Buffer;
                    const bytes = 12 + lengthBytes;
                    for (data = input.read(bytes); data; data = input.read(bytes)) {
                        const wordID = bytesToBigInt(data.slice(0, 12));
                        const count = bytesToNumber(data.slice(12, 12 + lengthBytes));
                        const prevCount = hostBag.bag.get(wordID) || 0;
                        hostBag.bag.set(wordID, prevCount + count);
                    }
                    res();
                });
            });
            input.destroy();
            //if (hostBag.bag.size > 10000) break;
        }
        fancyLog("Writing lexicon to BOW file.")
        const { length, file } = hostBag.toBufferFile();
        fancyLog(`Moving lexicon to correct location from ${file} (length: ${length}).`)
        await new HostID(host).replaceVersion(Date.now(), VersionType.BAG_OF_WORDS, file, length);
        fancyLog(`Host ${host} complete.`);
    }
    (await SQL.db()).destroy();
    await Redis.quit();
}

main();