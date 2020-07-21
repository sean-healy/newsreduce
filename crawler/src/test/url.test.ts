import { ResourceURL } from "types/objects/ResourceURL";

test("url parse edge cases", () => {
    const resource = new ResourceURL("https://en.wikipedia.org/wiki/Ahoy!");
    console.log(JSON.stringify(resource));
});
