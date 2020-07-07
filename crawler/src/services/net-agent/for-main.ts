import express from "express";
import fs from "fs";
import dns from "dns";
import { log } from "../../common/logging";

const PORT = 9999;

const hostsContent = fs.readFileSync("/var/newsreduce/network");
const hosts = hostsContent.toString().split(/\n/g).filter(host => host).concat(["127.0.0.1"]);
const whitelist = new Set();
hosts.forEach(host =>
    dns.lookup(host, (err, address, family) => {
        if (err) console.debug(err);
        else {
            if (family === 4) address = `::ffff:${address}`;
            whitelist.add(address);
        }
    }));

function serve() {
    const app = express();
    app.use((req, res, next) => {
        if (whitelist.has(req.ip)) next();
        else {
            res.sendStatus(401);
        }
    });
    app.get("", (req, res) => {
        log(`Request for parameters from ${req.ip}.`);
        res.send({
            sql: fs.readFileSync("/var/newsreduce/sql_password").toString().replace(/\n$/g, ""),
        })
    });
    app.get("/net", (req, res) => {
        log(`Request for network info from ${req.ip}.`);
        res.send(hostsContent);
    });

    app.listen(PORT, () => console.log(`Main net agent running on port ${PORT} `));
}

serve();
