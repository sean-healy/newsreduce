import { VersionType } from "types/db-objects/VersionType";

test("ID gen works as expected.", () => {
    const id = VersionType.LINK_HITS.getID();
    expect(id).toBe(69214628151549066893569841155n);
});