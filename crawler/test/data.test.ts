import { selectThrottles, selectPreSchedule } from "../src/data";
import { getHostID } from "../src/common/ids";

test("selecting throttle should work", async () => {
    const host = "en.wikipedia.org";
    const throttle = (await selectThrottles([host]));
    console.log({ throttle });
    const id = getHostID(host).id;
    expect(throttle.has(id)).toBe(true);
    expect(throttle.get(id)).toBe(1050);
});

test("selecting items to schedule should work", async () => {
    const preSchedule = await selectPreSchedule();
    expect(preSchedule.length <= 500);
});
