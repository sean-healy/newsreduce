import { Version } from "./Version";
import { Host } from "./Host";

export class HostVersion extends Version<HostVersion, Host> {
    table(): string {
        return "HostVersion";
    }
    idCol() {
        return "host";
    }
}
