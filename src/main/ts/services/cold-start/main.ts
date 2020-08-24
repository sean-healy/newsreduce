import { insertColdStartObjects } from "services/cold-start/functions";
import { SQL } from "common/SQL";
import { fancyLog } from "utils/alpha";

insertColdStartObjects().then(async () => {
    fancyLog("Done.");
    SQL.destroy();
    process.exit(0);
});
