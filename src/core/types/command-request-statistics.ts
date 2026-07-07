export class CommandRequestStatistics {
    public readonly envelopes: number;
    public readonly requestSize: number;
    public readonly recipients: number;

    public constructor(init?: {
        envelopes?: number;
        requestSize?: number;
        recipients?: number;
    }) {
        this.envelopes = init?.envelopes ?? 0;
        this.requestSize = init?.requestSize ?? 0;
        this.recipients = init?.recipients ?? 0;
    }
}
