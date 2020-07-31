import { GlobalConfig } from "common/GlobalConfig";

test("ini parser works", async () => {
    const config = GlobalConfig.softFetch();

    expect(!!config).toBe(true);
});