import dns from "dns";
import fetch from "node-fetch";

export class DNS {
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
        const ip = await fetch("http://newsreduce.org:9999/ip").then(response => response.text());

        return ip;
    }
}
