import {
    FETCHER_BIRTH_LOG,
    FETCH_COMPLETE,
    FETCHER_DEATH_LOG
} from "common/events";
import { start } from "common/worker";
import { pollAndFetch } from "services/fetcher/functions";

// Sigh, this seems necessary.
export let checkin = [Date.now()]
setTimeout(() => {
    if (Date.now() - checkin[0] > 60 * 10000) {
        process.exit(1);
    }
}, 61 * 1000);

start(pollAndFetch, FETCHER_BIRTH_LOG, FETCHER_DEATH_LOG, null, FETCH_COMPLETE);
