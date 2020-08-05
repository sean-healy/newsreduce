import { ResourceVersion } from "types/db-objects/ResourceVersion";
import { ResourceURL } from "types/db-objects/ResourceURL";
import { VersionType } from "types/db-objects/VersionType";

test("ResourceVersion works", () => {
    const version = new ResourceVersion({
        entity: new ResourceURL("https://example.com"),
        time: 1595414156,
        type: VersionType.RAW_HTML,
        length: 10,
    });

    console.log(version.getInsertParams());
});
