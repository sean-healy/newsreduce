import { DBObject } from "types/DBObject";
import { Redis, REDIS_PARAMS } from "common/Redis";
import { STR_ONE } from "common/util";

type ConstructorArg0 =
    string | { [key in keyof Host]?: Host[key] };

export class Host extends DBObject<Host> {
    readonly name: string;
    readonly throttle: number;

    constructor(paramsOrName?: ConstructorArg0, throttle?: number) {
        if (paramsOrName === null || paramsOrName === undefined) super();
        else if (typeof paramsOrName === "string") {
            super({
                name: paramsOrName,
                throttle,
            });
        }
        else super(paramsOrName);
    }

    hashSuffix(): string {
        return this.name;
    }
    insertCols(): string[] {
        return ["id", "name", "throttle"];
    }
    getInsertParams(): any[] {
        return [this.getID(), this.name, this.throttle ? this.throttle : 1050];
    }
    table(): string {
        return "Host";
    }
    async applyThrottle() {
        console.log("applying throttle");
        console.log(this);
        await Redis.renewRedis(REDIS_PARAMS.throttle).setpx(this.name, this.throttle, STR_ONE)
    }
    async crawlAllowed() {
        return !(await Redis.renewRedis(REDIS_PARAMS.throttle).eq(this.name));
    }
    async popURLForFetching() {
        return await Redis.renewRedis(REDIS_PARAMS.fetchSchedule).zpopmax(this.name, 1);
    }
}
