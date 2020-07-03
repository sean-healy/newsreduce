export enum Entity {
    RESOURCE,
    HOST,
    WORD,
}

export function entityName(entity: Entity) {
    switch (entity) {
        case Entity.RESOURCE: return "resource";
        case Entity.HOST: return "host";
        case Entity.WORD: return "word";
    }
}
