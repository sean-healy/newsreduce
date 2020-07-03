import { selectPreSchedule, schedule } from "../data";
import { SCHEDULE_COMPLETE, COLD_START_COMPLETE } from "../common/events";
import { startProcessor } from "../common/processor";

async function findAndSchedule() {
    const urls = await selectPreSchedule();
    await schedule(urls);
    console.log(`Scheduled ${urls.length} URLs.`);
}

startProcessor(findAndSchedule, new Set([COLD_START_COMPLETE]), SCHEDULE_COMPLETE);
