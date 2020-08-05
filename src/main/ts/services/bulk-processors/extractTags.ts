import fs from "fs";
import { JSDOM } from "jsdom";

// WIP
export function main() {
    const content = fs.readFileSync("/tmp/raw.html");
    const dom = new JSDOM(content);
    const body = dom.window.document.body;
    const stack: [number, Element][] = [];
    stack.push([0, body]);
    while (stack.length) {
        const [depth, element] = stack.pop();
        for (let i = 0; i < depth; ++i)
            process.stdout.write(" ");
        console.log(depth, element.tagName);
        const children = element.children;
        const length = children.length;
        for (let i = 0; i < length; ++i) {
            const child = children.item(i);
            stack.push([depth + 1, child]);
        }
    }
}

main();