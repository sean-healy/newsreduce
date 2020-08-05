import { ConstructorType, SuperConstructorType } from "./SimpleHashObject";
import { EntityObject } from "./EntityObject";
import { Entity } from "types/Entity";
import { VersionType } from "./VersionType";
import { Version } from "./Version";
import { PredicateVersion } from "./PredicateVersion";

export class Predicate extends EntityObject<Predicate> {
    static RES_IS_NEWS_SOURCE_WIKI = new Predicate("res-is-news-source-wiki");
    static T = new Predicate("t");

    readonly functor: string;

    constructor(arg?: ConstructorType<Predicate>) {
        if (arg === null || arg === undefined) super();
        else if (typeof arg === "string" || arg instanceof Buffer)
            super({ functor: arg } as (SuperConstructorType<Predicate>));
        else super(arg);
    }

    hashSuffix(): string {
        return this.functor.toString();
    }
    insertCols(): string[] {
        return ["id", "functor"];
    }
    getInsertParams(): any[] {
        return [this.getID(), this.functor];
    }
    entity(): Entity {
        return Entity.PREDICATE;
    }
    versionObject(time: number, type: VersionType, length: number): Version<any, Predicate> {
        return new PredicateVersion({ time, type, length, entity: this });
    }
    table(): string {
        return "Predicate";
    }

}

export class PredicateID extends Predicate {
    readonly id: bigint;

    constructor(id: bigint) {
        super();
        this.id = id;
    }

    getID() {
        return this.id;
    }
    async enqueueInsert() { }
    getDeps() {
        return [];
    }
}
