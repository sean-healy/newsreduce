const { getParams } = require("../dist/common/connections.js");

test("net agent communication possible", async () => {
    const params = await getParams();
    expect("sql" in params).toBe(true);
});
