import dns from "dns";
import fetch from "node-fetch";
import { GlobalConfig } from "./GlobalConfig";
import { fancyLog } from "../utils/alpha";

export class DNS {
    static readonly LOCALHOST = DNS.ipv4AsIpv6("127.0.0.1");

    static lookup(hostname: string) {
        return new Promise<string>((res, rej) => {
            dns.lookup(hostname, (err, address, family) => {
                if (err) rej(err);
                else if (family === 4) res(DNS.ipv4AsIpv6(address));
                else res(address);
            });
        });
    }

    static ipv4AsIpv6(ipv4: string) {
        return `::ffff:${ipv4}`
    }

    static async whoami() {
        const { host, port } = GlobalConfig.softFetch().mainNetAgent;
        let ip: string;
        try {
            ip = await fetch(`http://${host}:${port}/ip`).then(response => response.text());
        } catch (e) {
            fancyLog(JSON.stringify(e));
            ip = DNS.LOCALHOST;
        }

        return ip;
    }
}
