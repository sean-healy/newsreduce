import { Redis, REDIS_PARAMS } from "common/Redis";
import { STR_ONE } from "common/util";
import { EntityObject } from "./EntityObject";
import { Entity } from "types/Entity";
import { VersionType } from "./VersionType";
import { HostVersion } from "./HostVersion";

type ConstructorArg0 =
    string | { [key in keyof Host]?: Host[key] };

export class Host extends EntityObject<Host> {
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
        await Redis.renewRedis(REDIS_PARAMS.throttle).setpx(this.name, this.throttle, STR_ONE)
    }
    async crawlAllowed() {
        return !(await Redis.renewRedis(REDIS_PARAMS.throttle).eq(this.name));
    }
    async popURLForFetching() {
        return await Redis.renewRedis(REDIS_PARAMS.fetchSchedule).zpopmax(this.name, 1);
    }
    entity() {
        return Entity.HOST;
    }
    versionObject(time: number, type: VersionType, length: number) {
        return new HostVersion({ time, type, length, entity: this, created: Date.now() });
    }
}

export class HostID extends Host {
    readonly id: bigint;

    constructor(id: bigint) {
        super();
        this.id = id;
    }

    getID() {
        return this.id;
    }
}
