export class LsuSequencerConnection {
    public readonly endpoints: string[];
    public readonly customTrustCertificates?: Uint8Array;

    public constructor(init: {
        endpoints?: string[];
        customTrustCertificates?: Uint8Array;
    } = {}) {
        this.endpoints = [...(init.endpoints ?? [])];
        this.customTrustCertificates =
            init.customTrustCertificates === undefined
                ? undefined
                : new Uint8Array(init.customTrustCertificates);
    }
}

export class LsuSequencerConnectionSuccessor {
    public readonly sequencerId: string;
    public readonly successorPhysicalSynchronizerId: string;
    public readonly connection?: LsuSequencerConnection;

    public constructor(init: {
        sequencerId: string;
        successorPhysicalSynchronizerId: string;
        connection?: LsuSequencerConnection;
    }) {
        this.sequencerId = init.sequencerId;
        this.successorPhysicalSynchronizerId =
            init.successorPhysicalSynchronizerId;
        this.connection = init.connection;
    }
}
