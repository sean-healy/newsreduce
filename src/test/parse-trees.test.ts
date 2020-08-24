import fs from "fs";
import path from "path";
import { DecisionForest } from "ml/trees/DecisionForest";

test("saving a link should work", async () => {
    const file = path.join(__dirname, "misc/decision-tree.txt");
    const content = fs.readFileSync(file);
    const trees = DecisionForest.parse<string, boolean, boolean>(content);
    for (const tree of trees.trees) {
        console.log(JSON.stringify(tree.toJSON(), null, 2));
    }
});