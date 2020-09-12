import { selectPreSchedule, schedule } from "data";
import { SCHEDULE_COMPLETE, COLD_START_COMPLETE } from "common/events";
import { startProcessor } from "common/processor";

async function findAndSchedule() {
    await schedule(await selectPreSchedule());
}

startProcessor(findAndSchedule, new Set([COLD_START_COMPLETE]), SCHEDULE_COMPLETE, {
    // Once a minute.
    period: 60000,
});
