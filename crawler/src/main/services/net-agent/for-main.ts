import fs from "fs";
import { log } from "common/logging";
import { newFilteredServer } from "./functions";
import { fancyLog } from "common/util";
import { SQL } from "common/SQL";
import { DBObject } from "types/DBObject";
import { findTimes, findFormats } from "file";
import { Entity } from "types/Entity";

const PORT = 9999;

async function serve() {
    const app = await newFilteredServer();
    app.get("", (req, res) => {
        log(`Request for parameters from ${req.ip}.`);
        res.send({
            sql: fs.readFileSync("/var/newsreduce/sql_password").toString().replace(/\n$/g, ""),
        })
    });
    app.get("/net", (req, res) => {
        log(`Request for network info from ${req.ip}.`);
        res.send(fs.readFileSync("/var/newsreduce/network"));
    });
    app.get("/ip", (req, res) => {
        log(`Request ip info for ${req.ip}.`);
        res.send(req.ip);
    });
    app.get("/public-key", (req, res) => {
        log(`Request SSH public key info for ${req.ip}.`);
        res.send(fs.readFileSync("/var/newsreduce/.ssh/id_rsa.pub"));
    });
    app.get("/query", async (req, res) => {
        const encodedSQL = req.query.sql as string;
        console.log(encodedSQL);
        const sql = Buffer.from(encodedSQL, "hex").toString();
        const result = await SQL.query<{ [key: string]: any }[]>(sql);
        DBObject.stringifyBigIntsInPlace(result);
        res.send(JSON.stringify(result));
    });
    app.get("/resource-times", async (req, res) => {
        const id = BigInt(req.query.id);
        const times = await findTimes(Entity.RESOURCE, id);
        res.send(JSON.stringify(times));
    });
    app.get("/resource-formats", async (req, res) => {
        const id = BigInt(req.query.id);
        const time = Number(req.query.time);
        const formats = (await findFormats(Entity.RESOURCE, id, time)).map(format => format.filename);
        res.send(JSON.stringify(formats));
    });

    app.listen(PORT, () => fancyLog(`Main net agent running on port ${PORT} `));
}

serve();
