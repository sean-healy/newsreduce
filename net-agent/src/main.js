const express = require('express')
const fs = require('fs')
const dns = require('dns')
const app = express();
const port = 9999;

fs.readFile("/var/newsreduce/network", async (err, content) => {
    const hosts = content.toString().split(/\n/g).filter(host => host).concat(["127.0.0.1"]);
    const whitelist = new Set();
    for (const host of hosts) {
        const ip = await new Promise((res, rej) => {
            dns.lookup(host, (err, address, family) => {
                if (err) rej(err);
                else {
                    if (family === 4) address = `::ffff:${address}`;
                    res(address);
                }
            });
        });
        whitelist.add(ip);
    }
    app.use((req, res, next) => {
        if (whitelist.has(req.ip)) next();
        else {
            res.sendStatus(401);
        }
    });
    app.get("", (req, res) => {
        res.send({
            sql: fs.readFileSync("/var/newsreduce/sql_password").toString().replace(/\n$/g, ""),
        })
    });
    app.get("/net", (req, res) => {
        res.send(content);
    });

    app.listen(port, () => console.log(`Net agent running on port ${port}`));
});
