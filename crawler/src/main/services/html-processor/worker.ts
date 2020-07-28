import {
    HTML_PROCESS_BIRTH_LOG,
    HTML_PROCESS_COMPLETE,
    HTML_PROCESS_DEATH_LOG
} from "common/events";
import { start } from "common/worker";
import { process } from "services/html-processor/functions";

start(process, HTML_PROCESS_BIRTH_LOG, HTML_PROCESS_DEATH_LOG, null, HTML_PROCESS_COMPLETE);
