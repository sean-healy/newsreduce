import {
    FETCHER_BIRTH_LOG,
    FETCH_COMPLETE,
    FETCHER_DEATH_LOG
} from "common/events";
import { start } from "common/worker";
import { pollAndFetch } from "services/fetcher/functions";
import { ResourceBlocked } from "types/db-objects/ResourceBlocked";
import { ResourceURL } from "types/db-objects/ResourceURL";

// Sigh, this seems necessary.
export let checkin = [Date.now()]
export let lastProcessing: [string] = [null]
setTimeout(() => {
    if (Date.now() - checkin[0] > 60 * 10000) {
        try {
            new ResourceBlocked({
                resource: new ResourceURL(lastProcessing[0])
            }).enqueueInsert({ recursive: true });
        } catch (e) {

        }
        process.exit(1);
    }
}, 61 * 1000);

start(pollAndFetch, FETCHER_BIRTH_LOG, FETCHER_DEATH_LOG, null, FETCH_COMPLETE);
