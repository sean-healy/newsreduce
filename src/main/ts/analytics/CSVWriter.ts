import fs from "fs";

export class CSVWriter {
    readonly path: string;

    constructor(path: string, ...headings: any[]) {
        this.path = path;
        fs.writeFileSync(path, CSVWriter.csvRow(headings) + "\n");
    }

    append(...args: any[]) {
        fs.appendFileSync(this.path, CSVWriter.csvRow(args) + "\n");
    }
    static csvField(param: any) {
        //fancyLog("csvField " + `${param}`);
        let stringified: string;
        if (param === null || param === undefined) stringified = "NULL";
        else if (typeof param === "boolean") {
            const paramAsTinyint = param ? 1 : 0;
            stringified = `"${paramAsTinyint}"`;
        } else {
            const paramAsString = param.toString();
            const escapedParam = paramAsString.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
            stringified = `"${escapedParam}"`
        }

        return stringified;
    }
    static csvRow(params: any[]) {
        return params.map(CSVWriter.csvField).join(",");
    }
}