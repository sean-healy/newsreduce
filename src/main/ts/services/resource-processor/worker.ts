import {
    HTML_PROCESS_BIRTH_LOG,
    HTML_PROCESS_COMPLETE,
    HTML_PROCESS_DEATH_LOG
} from "common/events";
import { start } from "common/worker";
import { buildProcessFunction, EXTRACTORS } from "services/resource-processor/functions";

const process = buildProcessFunction(EXTRACTORS.map(c => new c()))

start(process, HTML_PROCESS_BIRTH_LOG, HTML_PROCESS_DEATH_LOG, null, HTML_PROCESS_COMPLETE);
