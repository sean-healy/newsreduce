import { setImmediateInterval } from "utils/alpha";
import { Trainer } from "./Trainer";
import { ExtractNewsSourceWikiModel } from "./ExtractNewsSourceWikiModel";
import { ExtractOfficialHomepageModel } from "./ExtractOfficialHomepageModel";

const RECURRING_JOBS: Trainer[] = [
    new ExtractOfficialHomepageModel(),
    //new ExtractNewsSourceWikiModel(),
];
const JOB_LAST_STARTED: number[] = RECURRING_JOBS.map(_ => 0);
let RUNNING = false;

async function main() {
    if (RUNNING) return;
    RUNNING = true;
    for (let i = 0; i < RECURRING_JOBS.length; ++i) {
        const job = RECURRING_JOBS[i];
        const lastStarted = JOB_LAST_STARTED[i];
        const frequency = job.frequency();
        const now = Date.now();
        if (lastStarted + frequency < now) {
            JOB_LAST_STARTED[i] = now;
            // Don't run in parallel
            // (due to memory limits on individual Node processes).
            await job.train();
        }
    }
    RUNNING = false;
}

setImmediateInterval(main, 1000)