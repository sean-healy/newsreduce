import { selectBagOfWordsByHost } from "data";
import { ResourceID } from "types/objects/ResourceURL";
import { ResourceVersionType } from "types/objects/ResourceVersionType";
import { BagOfWords } from "types/BagOfWords";

async function main() {
    const bags = await selectBagOfWordsByHost();

    for (const host of bags.keys()) {
        const hostBags = bags.get(host);
        for (const [resource, time] of hostBags) {
            const bowBuffer = (await new ResourceID(resource).read(time, ResourceVersionType.BAG_OF_WORDS))
            if (bowBuffer) {
                const bag = new BagOfWords().fromBuffer(bowBuffer);
                console.log(bag.toString());
            }
        }
    }
}

main();
