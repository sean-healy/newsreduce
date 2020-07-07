import { ResourceURL } from "./Resource";

export interface ResourceExtra extends ResourceURL {
    id: bigint;
    hostname: string;
    throttle: number;
}
