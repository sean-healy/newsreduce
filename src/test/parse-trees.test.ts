import fs from "fs";
import path from "path";
import { DecisionTree } from "ml/DecisionTree";

test("saving a link should work", async () => {
    const file = path.join(__dirname, "misc/decision-tree.txt");
    const content = fs.readFileSync(file);
    const trees = DecisionTree.parseRandomForest(content);
    for (const tree of trees) {
        console.log(JSON.stringify(tree.toJSON(), null, 2));
    }
});