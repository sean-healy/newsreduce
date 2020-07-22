import { ResourceVersion } from "types/objects/ResourceVersion";
import { ResourceURL } from "types/objects/ResourceURL";
import { ResourceVersionType } from "types/objects/ResourceVersionType";

test("ResourceVersion works", () => {
    const version = new ResourceVersion({
        resource: new ResourceURL("https://example.com"),
        time: 1595414156,
        type: ResourceVersionType.RAW_HTML,
    });
    console.log(version.getInsertParams());
});
