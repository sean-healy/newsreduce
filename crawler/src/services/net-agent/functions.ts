import fs from "fs";
import dns from "dns";
import express from "express";

export async function getGuestlist() {
    const hostsContent = fs.readFileSync("/var/newsreduce/network");
    const hosts = hostsContent.toString().split(/\n/g).filter(host => host).concat(["127.0.0.1"]);
    const guestlist = new Set(await Promise.all(hosts.map(host => new Promise<string>((res, rej) =>
        dns.lookup(host, (err, address, family) => {
            if (err) {
                console.debug(err);
                rej(err);
            } else {
                if (family === 4) address = `::ffff:${address}`;
                res(address);
            }
        })))));

    return guestlist;

}

let GUESTLIST: Set<string> = null;
export async function cacheGuestlist() {
    if (!GUESTLIST) GUESTLIST = await getGuestlist();

    return GUESTLIST;
}

export async function newFilteredServer() {
    const whitelist = await cacheGuestlist();
    const app = express();
    app.use((req, res, next) => {
        if (whitelist.has(req.ip)) next();
        else res.sendStatus(401);
    });

    return app;
}
