import { insertColdStartObjects } from "services/cold-start/functions";
import { db } from "common/connections";

insertColdStartObjects().then(async () => {
    console.log("Done.");
    (await db()).destroy();
});
