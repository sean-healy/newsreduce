import { Version } from "./Version";
import { Predicate } from "./Predicate";

export class PredicateVersion extends Version<PredicateVersion, Predicate> {
    table(): string {
        return "PredicateVersion";
    }
    idCol() {
        return "predicate";
    }
}
