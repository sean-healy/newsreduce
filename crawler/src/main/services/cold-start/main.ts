import { insertColdStartObjects } from "services/cold-start/functions";
import { SQL } from "common/SQL";

insertColdStartObjects().then(async () => {
    console.log("Done.");
    SQL.destroy();
    process.exit(0);
});
