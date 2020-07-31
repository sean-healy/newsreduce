import {
    FETCHER_BIRTH_LOG,
    FETCH_COMPLETE,
    FETCHER_DEATH_LOG
} from "common/events";
import { start } from "common/worker";
import { pollAndFetch } from "services/fetcher/functions";

start(pollAndFetch, FETCHER_BIRTH_LOG, FETCHER_DEATH_LOG, null, FETCH_COMPLETE);
