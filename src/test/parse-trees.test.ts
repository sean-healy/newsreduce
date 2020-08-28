import fs from "fs";
import path from "path";
import { Ensemble } from "ml/classifiers/Ensemble";

test("saving a link should work", async () => {
    const file = path.join(__dirname, "misc/decision-tree.txt");
    const content = fs.readFileSync(file);
    const trees = new Ensemble().parse(content);
    for (const tree of trees.classifiers) {
        console.log(JSON.stringify(tree.toJSON(), null, 2));
    }
});