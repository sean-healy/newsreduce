import { BULK_INSERT_COMPLETE } from "common/events";
import { startProcessor } from "common/processor";
import { bulkInsert } from "services/inserter/functions";

startProcessor(
    bulkInsert,
    null,
    BULK_INSERT_COMPLETE,
    { interval: true, period: 100 }
);
