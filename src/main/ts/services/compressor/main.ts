import { compress } from "./functions";
import { startProcessor } from "common/processor";
import { COMPRESS_COMPLETE } from "common/events";

startProcessor(compress, null, COMPRESS_COMPLETE);