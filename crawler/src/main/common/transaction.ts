import { db } from "../common/connections";

export async function errRollbackInner(err: any) {
    (await db()).rollback(rollbackErr => {
        if (rollbackErr) console.debug(rollbackErr);
        else console.debug(err);
    });
}
export function errRollback() {
    return (err: any) => errRollbackInner(err);
}
export function thenCommit() {
    return async () => {
        (await db()).commit(commitErr => {
            if (commitErr) errRollbackInner(commitErr);
        });
    };
}
