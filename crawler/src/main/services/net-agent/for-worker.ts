import { newRedis } from "common/connections";
import { myIP } from "common/config";
import { NET_AGENT_LOG, DELETE_FILES } from "common/events";

async function watch() {
    const ip = await myIP();
    const client = newRedis(ip);
    client.subscribe(NET_AGENT_LOG);
    console.log("Subscribed to channel:", NET_AGENT_LOG);
    client.on(DELETE_FILES, (_, msg: string) => {
        const lines = msg.split("\n").map(line => line.split("\t", 2));
        console.log(lines);
    });
}
watch();
