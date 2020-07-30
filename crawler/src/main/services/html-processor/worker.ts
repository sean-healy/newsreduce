import {
    HTML_PROCESS_BIRTH_LOG,
    HTML_PROCESS_COMPLETE,
    HTML_PROCESS_DEATH_LOG
} from "common/events";
import { start } from "common/worker";
import { buildProcessFunction } from "services/html-processor/functions";
import { ExtractHits } from "services/html-processor/ExtractHits";
import { ExtractAHrefs } from "services/html-processor/ExtractAHrefs";
import { ExtractRawText } from "services/html-processor/ExtractRawText";
import { ExtractWikiTree } from "services/html-processor/ExtractWikiTree";
import { ExtractTitle } from "services/html-processor/ExtractTitle";
import { ExtractRepresentations } from "services/html-processor/ExtractRepresentations";

const process = buildProcessFunction(
    [ExtractAHrefs, ExtractTitle, ExtractWikiTree, ExtractRawText, ExtractHits, ExtractRepresentations].map(c => new c()))

start(process, HTML_PROCESS_BIRTH_LOG, HTML_PROCESS_DEATH_LOG, null, HTML_PROCESS_COMPLETE);
