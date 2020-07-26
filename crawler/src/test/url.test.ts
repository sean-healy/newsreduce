import { ResourceURL } from "types/objects/ResourceURL";

test("url parse edge cases", () => {
    const resource = new ResourceURL("https://en.wikipedia.org:443/wiki/Category:News_media");
    const url = resource.toURL();
    console.log(resource.getID());
    console.log(url);
    let resource2: ResourceURL;
    try {
        resource2 = new ResourceURL("https://creativecommons.org/licenses/by-sa/3.0/");
    } catch (e) {
        console.log(JSON.stringify(e));
    }
    console.log(resource2);
});
