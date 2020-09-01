import { setImmediateInterval } from "utils/alpha";
import { PredictNewsSourceWiki } from "./PredictNewsSourceWiki";
import { Predictor } from "./Predictor";

const RECURRING_JOBS: Predictor[] = [
    new PredictNewsSourceWiki(),
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
            await job.predict();
        }
    }
    RUNNING = false;
}

setImmediateInterval(main, 1000)