export class TopologySignatureDelegation {
    public readonly sessionKey: Uint8Array;
    public readonly sessionKeySpec?: string;
    public readonly validityPeriodFromInclusive: string;
    public readonly validityPeriodDurationSeconds: number;
    public readonly format?: string;
    public readonly signature: Uint8Array;
    public readonly signingAlgorithmSpec?: string;

    public constructor(init: {
        sessionKey?: Uint8Array;
        sessionKeySpec?: string;
        validityPeriodFromInclusive?: string;
        validityPeriodDurationSeconds?: number;
        format?: string;
        signature?: Uint8Array;
        signingAlgorithmSpec?: string;
    } = {}) {
        this.sessionKey = new Uint8Array(init.sessionKey ?? []);
        this.sessionKeySpec = init.sessionKeySpec;
        this.validityPeriodFromInclusive =
            init.validityPeriodFromInclusive ?? "0";
        this.validityPeriodDurationSeconds =
            init.validityPeriodDurationSeconds ?? 0;
        this.format = init.format;
        this.signature = new Uint8Array(init.signature ?? []);
        this.signingAlgorithmSpec = init.signingAlgorithmSpec;
    }
}
