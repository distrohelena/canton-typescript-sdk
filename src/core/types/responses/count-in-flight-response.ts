export class CountInFlightResponse {
    public readonly pendingSubmissions: number;
    public readonly pendingTransactions: number;

    public constructor(init?: {
        pendingSubmissions?: number;
        pendingTransactions?: number;
    }) {
        this.pendingSubmissions = init?.pendingSubmissions ?? 0;
        this.pendingTransactions = init?.pendingTransactions ?? 0;
    }
}
