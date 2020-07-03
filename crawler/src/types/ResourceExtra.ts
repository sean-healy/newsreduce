import { Resource } from "./Resource";

export interface ResourceExtra extends Resource {
    id: bigint;
    hostname: string;
    throttle: number;
}
