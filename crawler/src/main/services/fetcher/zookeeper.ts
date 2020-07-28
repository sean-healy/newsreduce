import { start } from "common/zookeeper";
import { FETCHER_BIRTH_LOG, FETCHER_DEATH_LOG } from "common/events";

start(FETCHER_BIRTH_LOG, FETCHER_DEATH_LOG, 12);
