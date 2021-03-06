import "./setup.ts";
import { ResourceLink } from "types/db-objects/ResourceLink";
import { Word } from "types/db-objects/Word";

const url = "https://en.wikipedia.org/wiki/Main_Page";
const link = new ResourceLink(url, url, "Main page");
const word = new Word("the");
test("saving a link should work", async () => {
    const success = await new Promise(res => {
        link.singularInsert({ recursive: true })
            .then(() => res(true))
            .catch(err => {
                console.debug(err);
                res(false)
            });
    });
    expect(success).toBe(true);
});

test("saving a word should work", async () => {
    const success = await new Promise(res => {
        word.singularInsert({ recursive: true })
            .then(() => res(true))
            .catch(err => {
                console.debug(err);
                res(false)
            });
    });
    expect(success).toBe(true);
});
