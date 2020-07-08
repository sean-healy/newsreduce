import { selectPreSchedule } from "data";

test("selecting items to schedule should work", async () => {
    const preSchedule = await selectPreSchedule();
    expect(preSchedule.length <= 500);
});
