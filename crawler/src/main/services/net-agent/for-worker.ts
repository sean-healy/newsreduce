import { newRedis } from "common/connections";
import { myIP } from "common/config";
import { DELETE_FILES } from "common/events";

async function watch() {
    const ip = await myIP();
    const client = newRedis(ip);
    client.subscribe(DELETE_FILES);
    console.log("Subscribed to channel:", DELETE_FILES);
    client.on("message", (_, msg: string) => {
        const lines = msg.split("\n").map(line => line.split("\t", 2));
        console.log(lines);
    });
}
watch();