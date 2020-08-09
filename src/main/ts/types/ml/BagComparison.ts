import { ArrayBag } from "./ArrayBag";
import { DBObject } from "types/DBObject";
import { SQL } from "common/SQL";
import { GenericConstructor } from "types/GenericConstructor";

export class BagComparison<T extends DBObject<T>, V = string, B extends ArrayBag<T, V> = any>
    extends GenericConstructor<BagComparison<T, V, B>> {
    readonly reference: ArrayBag<T, V>
    readonly subject: ArrayBag<T, V>

    toCSV() {
        let i = 0;
        const headRow = SQL.csvRow(["rank", "id", "count", "group"]);
        console.log(headRow);
        for (const row of this.reference.array) {
            const csvRow = SQL.csvRow([i++, row[0].toString(16), row[1], "reference"]);
            console.log(csvRow);
        }
        i = 0;
        for (const row of this.subject.array) {
            const csvRow = SQL.csvRow([i++, row[0], row[1], "class"]);
            console.log(csvRow);
        }
    }
}
