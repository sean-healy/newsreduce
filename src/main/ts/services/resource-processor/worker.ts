import {
    HTML_PROCESS_BIRTH_LOG,
    HTML_PROCESS_COMPLETE,
    HTML_PROCESS_DEATH_LOG
} from "common/events";
import { start } from "common/worker";
import { buildProcessFunction } from "services/resource-processor/functions";
import { ExtractHits } from "services/resource-processor/ExtractHits";
import { ExtractAHrefs } from "services/resource-processor/ExtractAHrefs";
import { ExtractRawText } from "services/resource-processor/ExtractRawText";
import { ExtractWikiTree } from "services/resource-processor/ExtractWikiTree";
import { ExtractTitle } from "services/resource-processor/ExtractTitle";
import { ExtractRepresentations } from "services/resource-processor/ExtractMLRepresentations";
import { ExtractAnchorPaths } from "./ExtractAnchorPaths";
import { ExtractTokens } from "./ExtractTokens";

const process = buildProcessFunction(
    [
        ExtractAHrefs,
        ExtractAnchorPaths,
        ExtractTitle,
        ExtractWikiTree,
        ExtractRawText,
        ExtractHits,
        ExtractRepresentations,
        ExtractTokens,
    ].map(c => new c()))

start(process, HTML_PROCESS_BIRTH_LOG, HTML_PROCESS_DEATH_LOG, null, HTML_PROCESS_COMPLETE);
