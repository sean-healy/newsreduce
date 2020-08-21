import { ConstructorType, SuperConstructorType } from "./SimpleHashObject";
import { EntityObject } from "./EntityObject";
import { VersionType } from "./VersionType";
import { Version } from "./Version";
import { PredicateVersion } from "./PredicateVersion";
import { Entity } from "types/Entity";

export class Predicate extends EntityObject<Predicate> {
    static TRUE_SUFFIX = "TRUE";
    static FALSE_SUFFIX = "FALSE";

    static RES_IS_NEWS_SOURCE_WIKI = new Predicate("res-is-news-source-wiki");
    static SUB_DOC_IS_NEWS_SOURCE_HOMEPAGE = new Predicate("sub-doc-is-news-source-homepage");

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
    versionObject(time: number, type: VersionType, length: number): Version<any, Predicate> {
        return new PredicateVersion({ time, type, length, entity: this, created: Date.now() });
    }
    table(): string {
        return "Predicate";
    }
    entity() {
        return Entity.PREDICATE;
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
