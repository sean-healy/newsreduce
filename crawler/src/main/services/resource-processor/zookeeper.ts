import { start } from "common/zookeeper";
import { HTML_PROCESS_BIRTH_LOG, HTML_PROCESS_DEATH_LOG } from "common/events";

start(HTML_PROCESS_BIRTH_LOG, HTML_PROCESS_DEATH_LOG, 12);
