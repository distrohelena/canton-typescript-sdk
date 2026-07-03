export class RequestOptions {
    public readonly timeoutMs?: number;

    public constructor(init: { timeoutMs?: number } = {}) {
        this.timeoutMs = init.timeoutMs;
    }
}
