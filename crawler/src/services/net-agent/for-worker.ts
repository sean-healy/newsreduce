import { newRedis } from "../../common/connections";
import { myIP } from "../../common/config";
import { NET_AGENT_LOG, DELETE_FILE } from "../../common/events";
import { deleteIfChecksumMatches } from "../../common/fs";

async function watch() {
    const ip = await myIP();
    const client = newRedis(ip);
    client.subscribe(NET_AGENT_LOG);
    client.on(DELETE_FILE, (_, msg) => {
        const [path, checksum] = msg.split(" ", 2);
        deleteIfChecksumMatches(path, checksum);
    });
}
watch();
