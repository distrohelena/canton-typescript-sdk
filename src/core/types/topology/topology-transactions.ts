export class TopologyTransactionItem {
    public readonly sequencedAt?: Date;
    public readonly validFrom?: Date;
    public readonly validUntil?: Date;
    public readonly transaction: Uint8Array;
    public readonly rejectionReason?: string;

    public constructor(init: {
        sequencedAt?: Date;
        validFrom?: Date;
        validUntil?: Date;
        transaction?: Uint8Array;
        rejectionReason?: string;
    } = {}) {
        this.sequencedAt = init.sequencedAt;
        this.validFrom = init.validFrom;
        this.validUntil = init.validUntil;
        this.transaction = new Uint8Array(init.transaction ?? []);
        this.rejectionReason = init.rejectionReason;
    }
}

export class TopologyTransactions {
    public readonly items: TopologyTransactionItem[];

    public constructor(init: {
        items?: TopologyTransactionItem[];
    } = {}) {
        this.items = [...(init.items ?? [])];
    }
}
