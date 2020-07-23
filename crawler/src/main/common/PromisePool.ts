export class PromisePool {
    promises: Promise<void>[];
    threads: number;

    constructor(threads: number) {
        this.promises = [];
        this.threads = threads;
    }

    async register(fn: (res: () => void) => void) {
        this.promises.push(new Promise<void>(fn));
        if (this.promises.length === this.threads) await this.flush();
    }

    async flush() {
        await Promise.all(this.promises);
        this.promises = [];
    }
}
