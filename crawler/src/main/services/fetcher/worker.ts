import { FETCHER_BIRTH_LOG, SCHEDULE_COMPLETE, FETCH_COMPLETE, FETCHER_DEATH_LOG } from "common/events";
import { start } from "common/worker";
import { pollAndFetch } from "./functions";

start(pollAndFetch, FETCHER_BIRTH_LOG, FETCHER_DEATH_LOG, new Set(SCHEDULE_COMPLETE), FETCH_COMPLETE);
