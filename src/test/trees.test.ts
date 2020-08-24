import { DecisionTree } from "ml/trees/DecisionTree"

test("decision trees work", () => {
    const data: [Map<string, boolean>, boolean][] = [
        [new Map<string, boolean>([["weekday", false], ["bank holiday", false], ["sick", false]]), false],
        [new Map<string, boolean>([["weekday", false], ["bank holiday", false], ["sick", true]]), false],
        [new Map<string, boolean>([["weekday", false], ["bank holiday", true], ["sick", false]]), false],
        [new Map<string, boolean>([["weekday", false], ["bank holiday", true], ["sick", true]]), false],
        [new Map<string, boolean>([["weekday", true], ["bank holiday", false], ["sick", false]]), true],
        [new Map<string, boolean>([["weekday", true], ["bank holiday", false], ["sick", true]]), false],
        [new Map<string, boolean>([["weekday", true], ["bank holiday", true], ["sick", false]]), false],
        [new Map<string, boolean>([["weekday", true], ["bank holiday", true], ["sick", true]]), false],
    ]
    const decisionTree = new DecisionTree<string, boolean, boolean>().train(data, {});
    console.log(JSON.stringify(decisionTree.toJSON(), null, " "));
})