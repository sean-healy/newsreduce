import { FETCH_COMPLETE, HTML_PROCESS_COMPLETE } from "common/events";
import { startProcessor } from "common/processor";
import { process } from "services/html-processor/functions";

startProcessor(process, new Set([FETCH_COMPLETE]), HTML_PROCESS_COMPLETE);
